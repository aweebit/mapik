import { Codec, DeepFlat, Mapik, Utils } from "@aweebit/mapik";
import { Schema } from "effect";
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";

type ExperimentDataTableType = {
  timestamp: Date;
  acceleration_top_x: number;
  acceleration_top_y: number;
  acceleration_top_z: number;
  acceleration_bottom_x: number;
  acceleration_bottom_y: number;
  acceleration_bottom_z: number;
};

interface Database {
  experiment_data: ExperimentDataTableType;
}

// @ts-expect-error
const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

const Vector3d = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]);

class ExperimentData extends Schema.Class<ExperimentData>("ExperimentData")({
  timestamp: Schema.Date,
  acceleration: Schema.Struct({ top: Vector3d, bottom: Vector3d }),
}) {}

// Codec for vector conversion between array and object representation
const Vector3dCodec = Codec.makeFor<typeof Vector3d.Type>().encode({
  encode: ([x, y, z]) => ({ x, y, z }) as const,
  decode: ({ x, y, z }) => [x, y, z],
});

const adHocUnderscoreMapperFor = DeepFlat.AdHocDelimiterMapper.make("_").for;

const createEntityManager = <T, F extends Record<PropertyKey, unknown>>() => {
  const make = Mapik.make<T, F>();
  return <
    const CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map<keyof F> = Utils.DelimiterMap<"_", keyof F>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> =
      DeepFlat.Constraint.DeepFromFlat<DFM, F> & Codec.Infer.Encoded<CM>,
  >(
    codecMap: CM,
    ...[deepFlatMapOrMapper]: Utils.DelimiterMap<"_", keyof F> extends DFM
      ? [deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>]
      : [deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>]
  ): Mapik.Mapik<
    CM,
    DFM,
    T,
    D,
    // @ts-expect-error
    F
  > => {
    deepFlatMapOrMapper ??=
      adHocUnderscoreMapperFor<F>() as typeof deepFlatMapOrMapper & {};
    return make<CM, DFM, D>(codecMap, deepFlatMapOrMapper);
  };
};

// const experimentDataEntityManager = Mapik.makeFor<ExperimentData>()
//   .encode({ acceleration: { top: Vector3dCodec, bottom: Vector3dCodec } })
//   .flatten(adHocUnderscoreMapperFor<ExperimentDataTableType>());
const factory = createEntityManager<ExperimentData, ExperimentDataTableType>();
const experimentDataEntityManager = factory({
  acceleration: { top: Vector3dCodec, bottom: Vector3dCodec },
});

// const make = Mapik.make<ExperimentData, ExperimentDataTableType>();

// const mapik = make(
//   { acceleration: { top: Vector3dCodec, bottom: Vector3dCodec } },
//   Utils.createDeepenAtDelimiter("_")(
//     Utils.identityMap([
//       "timestamp",
//       "acceleration_top_x",
//       "acceleration_top_y",
//       "acceleration_top_z",
//       "acceleration_bottom_x",
//       "acceleration_bottom_y",
//       "acceleration_bottom_z",
//     ]),
//   ),
// );

// {
//   const make = Mapik.make<{ a: number }, { b: string }>();
//   const mapik = make(
//     { a: Codec.make({ decode: Number, encode: String }) },
//     { a: "b" },
//   );
// }

const newExperimentData = new ExperimentData({
  timestamp: new Date(),
  acceleration: { top: [0, 0, -9.81], bottom: [0, 0, -9.81] },
});

const encoded = experimentDataEntityManager.encode(newExperimentData);
const decoded = experimentDataEntityManager.decode(encoded);

[encoded, decoded].forEach((x) => {
  // @ts-expect-error
  console.log(x);
});

// // Insert newExperimentData
// await db
//   .insertInto("experiment_data")
//   .values(experimentDataEntityManager.encode(newExperimentData))
//   .execute();

// // Select some rows
// const selectedRows = await db
//   .selectFrom("experiment_data")
//   .selectAll()
//   .execute();

// // Convert rows to ExperimentData objects
// const selectedExperimentData = selectedRows.map(
//   (row) => new ExperimentData(experimentDataEntityManager.decode(row)),
// );

// // Also works with partial selects
// const selectedPartialRows = await db
//   .selectFrom("experiment_data")
//   .select([
//     "timestamp",
//     "acceleration_top_x",
//     "acceleration_top_y",
//     "acceleration_top_z",
//   ])
//   .execute();

// const selectedPartialExperimentData = selectedPartialRows.map((row) =>
//   experimentDataEntityManager.decode(row),
// );
// // Result type: { acceleration: { top: readonly [number, number, number] };
// //                timestamp: Date }[]
