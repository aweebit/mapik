import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-orm/effect-schema";
import {
  bigint,
  doublePrecision,
  snakeCase,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  Effect,
  Schema,
  SchemaGetter,
  SchemaParser,
  SchemaTransformation,
} from "effect";
import type { Simplify, UnionToIntersection } from "effect/Types";

const Optional = <S extends Schema.Top>(schema: S) => {
  const from = Schema.Union([
    Schema.Struct({ present: Schema.Literal(false) }),
    Schema.Struct({
      present: Schema.Literal(true),
      // Union strips mutability & optionality
      value: Schema.Union([Schema.toEncoded(schema)]),
    }),
  ]);
  const to = Schema.UndefinedOr(Schema.toType(schema));
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

const Vector3d = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);

class Experiment extends Schema.Class<Experiment>("Experiment")({
  name: Schema.String,
  timeStarted: Schema.Date,
  timeEnded: Optional(Schema.Date),
}) {}

class ExperimentData extends Schema.Class<ExperimentData>("ExperimentData")({
  experimentId: Schema.BigInt,
  timestamp: Schema.Date,
  pressure: Schema.Number,
  acceleration: Schema.Struct({
    top: Vector3d,
    bottom: Vector3d,
  }),
}) {}

const experiments = snakeCase.table("experiments", {
  id: bigint({ mode: "bigint" }).generatedAlwaysAsIdentity(),
  name: text().notNull(),
  timeStarted: timestamp({ withTimezone: true }).notNull(),
  timeEnded: timestamp({ withTimezone: true }),
});

const experimentData = snakeCase.table("experiment_data", {
  experimentId: bigint({ mode: "bigint" }).notNull(),
  timestamp: timestamp({ withTimezone: true }).notNull(),
  pressure: doublePrecision().notNull(),
  accelerationTopX: doublePrecision().notNull(),
  accelerationTopY: doublePrecision().notNull(),
  accelerationTopZ: doublePrecision().notNull(),
  accelerationBottomX: doublePrecision().notNull(),
  accelerationBottomY: doublePrecision().notNull(),
  accelerationBottomZ: doublePrecision().notNull(),
});

const ExperimentSelect = createSelectSchema(experiments);
const ExperimentInsert = createInsertSchema(experiments);

const makeDecode = <T, E>(f: (e: NoInfer<E>) => NoInfer<T>) => {
  return {
    decode: SchemaGetter.transform(f),
    encode: SchemaGetter.forbidden<E, T>(() => "encoding is not supported"),
  };
};

Schema.toType(Experiment).pipe(
  Schema.decodeTo(
    ExperimentInsert,
    makeDecode((input) => ({
      ...input,
      timeEnded: input.timeEnded ?? null,
    })),
  ),
);

ExperimentSelect.pipe(
  Schema.decodeTo(
    Schema.toType(Experiment),
    makeDecode((input) => ({
      ...input,
      timeEnded: input.timeEnded ?? undefined,
    })),
  ),
);

const ExperimentDataSelect = createSelectSchema(experimentData);
const ExperimentDataInsert = createInsertSchema(experimentData);

Schema.toType(ExperimentData).pipe(
  Schema.decodeTo(
    ExperimentDataInsert,
    makeDecode(
      ({
        acceleration: {
          top: [accelerationTopX, accelerationTopY, accelerationTopZ],
          bottom: [
            accelerationBottomX,
            accelerationBottomY,
            accelerationBottomZ,
          ],
        },
        ...rest
      }) =>
        Object.assign(rest, {
          accelerationTopX,
          accelerationTopY,
          accelerationTopZ,
          accelerationBottomX,
          accelerationBottomY,
          accelerationBottomZ,
        }),
    ),
  ),
);

ExperimentDataSelect.pipe(
  Schema.decodeTo(
    Schema.toType(ExperimentData),
    makeDecode(
      ({
        accelerationTopX,
        accelerationTopY,
        accelerationTopZ,
        accelerationBottomX,
        accelerationBottomY,
        accelerationBottomZ,
        ...rest
      }) =>
        Object.assign(rest, {
          acceleration: {
            top: [
              accelerationTopX,
              accelerationTopY,
              accelerationTopZ,
            ] as const,
            bottom: [
              accelerationBottomX,
              accelerationBottomY,
              accelerationBottomZ,
            ] as const,
          },
        }),
    ),
  ),
);

// type PropertyMap<I, O> =

// function propertyMapTransform<Deep extends Schema.Constraint, Flat extends Schema.Constraint, PropertyMap extends >(deepSchema: Deep, flatSchema: Flat) {

// }

type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};

type PropertyMap = DeepRecord<string, string>;

type PropertyMapDeepType<PM extends PropertyMap | string> =
  PM extends PropertyMap
    ? { [K in keyof PM & string]: PropertyMapDeepType<PM[K]> }
    : unknown;

type PropertyMapFlatType<PM extends PropertyMap> = Simplify<
  PropertyMapFlatTypeHelper<PM>
>;

type PropertyMapFlatTypeHelper<
  PM extends PropertyMap,
  K extends keyof PM & string = keyof PM & string,
> = UnionToIntersection<
  K extends unknown
    ? PM[K] extends string
      ? Record<PM[K], unknown>
      : PM[K] extends PropertyMap
        ? PropertyMapFlatType<PM[K]>
        : never
    : never
>;

type X = PropertyMapDeepType<{ a: { b: "ab" }; c: "c" }>;

type PropertyMapFlatten<
  PM extends PropertyMap,
  I extends PropertyMapDeepType<PM>,
> = Simplify<PropertyMapFlattenHelper<PM, I>>;

type PropertyMapFlattenHelper<
  PM extends PropertyMap,
  I,
  K extends keyof PM & keyof I & string = keyof PM & keyof I & string,
> = UnionToIntersection<
  K extends unknown
    ? PM[K] extends string
      ? Record<PM[K], I[K]>
      : PM[K] extends PropertyMap
        ? PropertyMapFlattenHelper<PM[K], I[K]>
        : never
    : never
>;

type Y = PropertyMapFlatten<
  { a: { b: "ab" }; c: "c" },
  { a: { b: number }; c: boolean }
>;

type PropertyMapDeepen<
  PM extends PropertyMap,
  I extends PropertyMapFlatType<PM>,
> = PropertyMapDeepenHelper<PM, I>;

type PropertyMapDeepenHelper<PM extends PropertyMap, I> = Simplify<{
  -readonly [K in keyof PM]: PM[K] extends keyof I & string
    ? I[PM[K]]
    : PM[K] extends PropertyMap
      ? PropertyMapDeepenHelper<PM[K], I>
      : never;
}>;

type Z = PropertyMapDeepen<
  { a: { b: "ab" }; c: "c" },
  { ab: number; c: boolean }
>;

function transformFromPropertyMap<const PM extends PropertyMap>(
  propertyMap: PM,
) {
  return {
    flatten: <I extends PropertyMapDeepType<PM>>(
      input: I,
    ): PropertyMapFlatten<PM, I> => {
      const result: Record<string, unknown> = {};
      const process = (pm: PropertyMap, i: Record<string, unknown>) => {
        Object.entries(pm).forEach(([key, value]) => {
          if (typeof value === "string") result[value] = i[key];
          else process(value, i[key] as Record<string, unknown>);
        });
      };
      process(propertyMap, input);
      return result as PropertyMapFlatten<PM, I>;
    },
    deepen: <I extends PropertyMapFlatType<PM>>(
      input: I,
    ): PropertyMapDeepen<PM, I> => {
      const process = (pm: PropertyMap): DeepRecord<string, unknown> => {
        return Object.fromEntries(
          Object.entries(pm).map(([key, value]) => [
            key,
            typeof value === "string" ? (input as any)[value] : process(value),
          ]),
        );
      };
      return process(propertyMap) as PropertyMapDeepen<PM, I>;
    },
  };
}

const transform = transformFromPropertyMap({ a: { b: "ab" }, c: "c" });
const res = transform.flatten({ a: { b: 123 }, c: false });
// console.log(res);
// console.log(transform.deepen(res as Readonly<typeof res>));

// type X =

// function transformFromDrizzleTable() {}
