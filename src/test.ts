import type { Table } from "drizzle-orm";
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
import { drizzle } from "drizzle-orm/node-postgres";

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
            ? SchemaParser.decodeEffect(schema)(obj.value, {
                ...options,
                disableChecks: true,
              })
            : Effect.succeed(undefined),
        encode: (value, options) =>
          value === undefined
            ? Effect.succeed({ present: false })
            : SchemaParser.encodeEffect(schema)(value, {
                ...options,
                disableChecks: true,
              }).pipe(Effect.map((value) => ({ present: true, value }))),
      }),
    ),
  );
};

const OptionalOverwrites = <T>(schema: Schema.Schema<T>) => {
  const typeSchema = Schema.toType(schema);
  return Schema.optional(typeSchema).pipe(
    Schema.encodeTo(
      Schema.NullOr(typeSchema),
      SchemaTransformation.transform<T | undefined, T | null>({
        encode: (val) => (val === undefined ? null : val),
        decode: (val) => (val === null ? undefined : val),
      }),
    ),
  );
};

const Vector3d = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);

const Vector3dOverwrites = Vector3d.pipe(
  Schema.encodeTo(
    Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number }),
    SchemaTransformation.transform({
      encode: ([x, y, z]) => ({ x, y, z }),
      decode: ({ x, y, z }) => [x, y, z],
    }),
  ),
);

class Experiment extends Schema.Class<Experiment>("Experiment")({
  name: Schema.String,
  timeStarted: Schema.Date,
  timeEnded: Optional(Schema.Date),
}) {}

const ExperimentOverwrites = Experiment.mapFields((fields) => ({
  ...fields,
  timeEnded: OptionalOverwrites(Schema.Date),
}));

class ExperimentData extends Schema.Class<ExperimentData>("ExperimentData")({
  experimentId: Schema.BigInt,
  timestamp: Schema.Date,
  pressure: Schema.Number,
  acceleration: Schema.Struct({
    top: Vector3d,
    bottom: Vector3d,
  }),
}) {}

const ExperimentDataOverwrites = ExperimentData.mapFields((fields) => ({
  ...fields,
  acceleration: Schema.Struct({
    top: Vector3dOverwrites,
    bottom: Vector3dOverwrites,
  }),
}));

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
      mapper(experiment).flatten(
        Schema.encodeSync(ExperimentOverwrites)(newExperiment),
      ),
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
      Schema.encodeSync(ExperimentDataOverwrites)(newExperimentData),
    ),
  );
