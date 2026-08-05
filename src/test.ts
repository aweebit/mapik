import type { Table } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  bigint,
  doublePrecision,
  primaryKey,
  snakeCase,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { Effect, Schema, SchemaParser, SchemaTransformation } from "effect";
import {
  createDeepenAtDelimiter,
  type DeepenAtDelimiter,
} from "./deepenAtDelimiter.js";
import {
  createDrizzleMapper,
  DrizzleTableMapper,
  type MapToSelf,
} from "./drizzle.js";
import {
  Transformation,
  TransformationMapper,
  type Infer,
} from "./Transformation.js";

const Optional = <S extends Schema.Constraint>(schema: S) => {
  const from = Schema.Union([
    Schema.Struct({ present: Schema.Literal(false) }),
    Schema.Struct({
      present: Schema.Literal(true),
      // Union strips mutability & optionality
      value: Schema.Union([Schema.toEncoded(schema)]),
    }),
  ]);
  const to = Schema.optional(Schema.toType(schema));
  return from.pipe(
    Schema.decodeTo(
      to,
      SchemaTransformation.transformOrFail({
        decode: (obj, options) =>
          obj.present
            ? SchemaParser.decodeEffect(schema)(obj.value, options)
            : Effect.succeed(undefined),
        encode: (value, options) =>
          value === undefined
            ? Effect.succeed({ present: false })
            : SchemaParser.encodeEffect(schema)(value, options).pipe(
                Effect.map((value) => ({ present: true, value })),
              ),
      }),
    ),
  );
};

const _OptionalOverwrites = new Transformation<any, any>({
  encode: (val) => (val === undefined ? null : val),
  decode: (val) => (val === null ? undefined : val),
});

const OptionalOverwrites = <T>(): Transformation<T | undefined, T | null> =>
  _OptionalOverwrites;

const Vector3d = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);

const Vector3dOverwrites = Transformation.make<
  typeof Vector3d.Type,
  { x: number; y: number; z: number }
>({
  encode: ([x, y, z]: typeof Vector3d.Type) => ({ x, y, z }),
  decode: ({ x, y, z }) => [x, y, z] as const,
});

class Experiment extends Schema.Class<Experiment>("Experiment")({
  name: Schema.String,
  timeStarted: Schema.Date,
  timeEnded: Optional(Schema.Date),
}) {}

const transformationMap = { timeEnded: OptionalOverwrites<Date>() };

const ExperimentOverwrites = TransformationMapper.for<Experiment>().encode({
  timeEnded: OptionalOverwrites<Date>(),
});

type A = Infer.Type<typeof transformationMap>;
type AA = Infer.Encoded<typeof transformationMap, Experiment>;

class ExperimentData extends Schema.Class<ExperimentData>("ExperimentData")({
  experimentId: Schema.BigInt,
  timestamp: Schema.Date,
  pressure: Schema.Number,
  acceleration: Schema.Struct({
    top: Vector3d,
    bottom: Vector3d,
  }),
}) {}

const ExperimentDataOverwrites =
  TransformationMapper.for<ExperimentData>().encode({
    acceleration: { top: Vector3dOverwrites, bottom: Vector3dOverwrites },
  });

const experiment = snakeCase.table("experiment", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  timeStarted: timestamp({ withTimezone: true }).notNull(),
  timeEnded: timestamp({ withTimezone: true }),
});

const experimentData = snakeCase.table(
  "experiment_data",
  {
    experimentId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => experiment.id),
    timestamp: timestamp({ withTimezone: true }).notNull(),
    pressure: doublePrecision().notNull(),
    acceleration_top_x: doublePrecision().notNull(),
    acceleration_top_y: doublePrecision().notNull(),
    acceleration_top_z: doublePrecision().notNull(),
    acceleration_bottom_x: doublePrecision().notNull(),
    acceleration_bottom_y: doublePrecision().notNull(),
    acceleration_bottom_z: doublePrecision().notNull(),
  },
  (table) => [primaryKey({ columns: [table.experimentId, table.timestamp] })],
);

const underscoreDeepen = createDeepenAtDelimiter("_");

const underscoreMake = <T extends Table>(
  table: T,
): DrizzleTableMapper<T, DeepenAtDelimiter<"_", MapToSelf<T>>> =>
  DrizzleTableMapper.make(table, underscoreDeepen);

const createUnderscoreDrizzleMapper = <const Ts extends readonly Table[]>(
  tables: Ts,
) => {
  return createDrizzleMapper(
    tables.map(underscoreMake) as {
      [K in keyof Ts]: DrizzleTableMapper<
        Ts[K],
        DeepenAtDelimiter<"_", MapToSelf<Ts[K]>>
      >;
    },
  );
};

const mapper = createUnderscoreDrizzleMapper([experiment, experimentData]);

const newExperiment = new Experiment({ name: "#1", timeStarted: new Date() });

const db = drizzle("TBD");

const experimentId = (
  await db
    .insert(experiment)
    .values(
      mapper(experiment).flatten(ExperimentOverwrites.encode(newExperiment)),
    )
    .returning({ id: experiment.id })
)[0]!.id;

const newExperimentData = new ExperimentData({
  experimentId,
  timestamp: new Date(),
  pressure: 0,
  acceleration: { top: [0, 0, 0], bottom: [0, 0, 0] },
});

await db
  .insert(experimentData)
  .values(
    mapper(experimentData).flatten(
      ExperimentDataOverwrites.encode(newExperimentData),
    ),
  );

const data = (await db.select().from(experimentData)).map(
  (row) =>
    new ExperimentData(
      ExperimentDataOverwrites.decode(mapper(experimentData).deepen(row)),
    ),
);

const data2 = (await db.select().from(experiment)).map(
  (row) =>
    new Experiment(ExperimentOverwrites.decode(mapper(experiment).deepen(row))),
);
