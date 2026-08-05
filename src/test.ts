import {
  bigint,
  doublePrecision,
  primaryKey,
  snakeCase,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { Effect, Schema, SchemaParser, SchemaTransformation } from "effect";
import * as Codec from "./Codec.js";
import { createEntityManagerClass } from "./EntityManager.js";

const EntityManager = createEntityManagerClass("_");

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

const _OptionalCodec = Codec.make<any, any>({
  encode: (val) => (val === undefined ? null : val),
  decode: (val) => (val === null ? undefined : val),
});

const OptionalCodec = <T>(): Codec.Codec<T | undefined, T | null> =>
  _OptionalCodec;

class Experiment extends Schema.Class<Experiment>("Experiment")({
  name: Schema.String,
  timeStarted: Schema.Date,
  timeEnded: Optional(Schema.Date),
}) {}

const Vector3d = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);

const Vector3dCodec = Codec.makeFor<typeof Vector3d.Type>().encode({
  encode: ([x, y, z]) => ({ x, y, z }) as const,
  decode: ({ x, y, z }) => [x, y, z],
});

const experimentTable = snakeCase.table("experiment", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  timeStarted: timestamp({ withTimezone: true }).notNull(),
  timeEnded: timestamp({ withTimezone: true }),
});

const experimentEntityManager = EntityManager.make<Experiment>()(
  experimentTable,
  { timeEnded: OptionalCodec<Date>() },
);

class ExperimentData extends Schema.Class<ExperimentData>("ExperimentData")({
  experimentId: Schema.BigInt,
  timestamp: Schema.Date,
  pressure: Schema.Number,
  acceleration: Schema.Struct({
    top: Vector3d,
    bottom: Vector3d,
  }),
}) {}

const experimentDataTable = snakeCase.table(
  "experiment_data",
  {
    experimentId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => experimentTable.id),
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

const experimentDataEntityManager = EntityManager.make<ExperimentData>()(
  experimentDataTable,
  { acceleration: { top: Vector3dCodec, bottom: Vector3dCodec } },
);

const experiment = new Experiment({ name: "#1", timeStarted: new Date() });

const experimentId = 1n;

const experimentData = new ExperimentData({
  experimentId,
  timestamp: new Date(),
  pressure: 0,
  acceleration: { top: [0, 0, 0], bottom: [0, 0, 0] },
});

const flatExperiment = experimentEntityManager.encode(experiment);
const flatExperimentData = experimentDataEntityManager.encode(experimentData);

const results = [
  flatExperiment,
  flatExperimentData,
  experimentEntityManager.decode(flatExperiment),
  experimentDataEntityManager.decode(flatExperimentData),
];

// @ts-ignore
console.log(results);
