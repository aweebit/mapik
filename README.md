[![NPM Version](https://img.shields.io/npm/v/%40aweebit%2Fmapik)](https://www.npmjs.com/package/@aweebit/mapik)

> [!WARNING]
> The library is still in the early stages of development and is not production-ready yet.

## Mapik
- Facilitates conversion between deeply nested objects and their corresponding flat rows in a relational database
- Supports conversion of objects only partially matching the expected structure, such as those resulting from SELECT queries that only select a subset of a table's columns
- Offers exceptional type safety with its advanced TypeScript types
- Comes with built-in convenience wrappers for Drizzle

## Examples

### Simple example

```ts
import { DeepFlat } from "@aweebit/mapik";

const mapper = new DeepFlat.Mapper({
  timestamp: "time",
  acceleration: {
    top: { x: "acc_tx", y: "acc_ty", z: "acc_tz" },
    bottom: { x: "acc_bx", y: "acc_by", z: "acc_bz" },
  },
});

const data = {
  timestamp: new Date(),
  acceleration: {
    top: { x: 0, y: 0, z: -9.81 },
    bottom: { x: 0, y: 0, z: -9.81 },
  },
};

const partialData = {
  acceleration: { top: { z: -9.81 }, bottom: { z: -9.81 } },
};

const flattenedData = mapper.flatten(data);
// Result: { time: Date /* ... */,
//           acc_tx: 0,
//           acc_ty: 0,
//           acc_tz: -9.81,
//           acc_bx: 0,
//           acc_by: 0,
//           acc_bz: -9.81 }

const flattenedPartialData = mapper.flatten(partialData);
// Result: { acc_tz: -9.81, acc_bz: -9.81 }

const originalData = mapper.deepen(flattenedData); // same as data
const originalPartialData = mapper.deepen(flattenedPartialData); // same as partialData
```

### Drizzle + Effect Schema

```ts
import { getColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { doublePrecision, pgTable, timestamp } from "drizzle-orm/pg-core";
import { Schema, Struct } from "effect";
import { Codec } from "@aweebit/mapik";
import { Drizzle } from "@aweebit/mapik/drizzle";

const experimentDataTable = pgTable("experiment_data", {
  timestamp: timestamp({ withTimezone: true }).primaryKey(),
  acceleration_top_x: doublePrecision().notNull(),
  acceleration_top_y: doublePrecision().notNull(),
  acceleration_top_z: doublePrecision().notNull(),
  acceleration_bottom_x: doublePrecision().notNull(),
  acceleration_bottom_y: doublePrecision().notNull(),
  acceleration_bottom_z: doublePrecision().notNull(),
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

// Entity manager factory with automatic deepening at "_" characters
const createEntityManager = Drizzle.createCreateEntityManager("_");

const experimentDataEntityManager = createEntityManager<ExperimentData>()(
  experimentDataTable,
  // In addition to the automatic "_" deepening, the entity manager should
  // automatically convert both vectors between their array and object
  // representations
  { acceleration: { top: Vector3dCodec, bottom: Vector3dCodec } },
);

const db = drizzle(process.env.DATABASE_URL);

const newExperimentData = new ExperimentData({
  timestamp: new Date(),
  acceleration: { top: [0, 0, -9.81], bottom: [0, 0, -9.81] },
});

// Insert newExperimentData
await db
  .insert(experimentDataTable)
  .values(experimentDataEntityManager.encode(newExperimentData));

// Select some rows
const selectedRows = await db.select().from(experimentDataTable);

// Convert rows to ExperimentData objects
const selectedExperimentData = selectedRows.map(
  (row) => new ExperimentData(experimentDataEntityManager.decode(row)),
);

// Also works with partial selects
const selectedPartialRows = await db
  .select(
    Struct.pick(getColumns(experimentDataTable), [
      "timestamp",
      "acceleration_top_x",
      "acceleration_top_y",
      "acceleration_top_z",
    ]),
  )
  .from(experimentDataTable);

const selectedPartialExperimentData = selectedPartialRows.map((row) =>
  experimentDataEntityManager.decode(row),
);
// Result type: { acceleration: { top: readonly [number, number, number] };
//                timestamp: Date }[]
```
