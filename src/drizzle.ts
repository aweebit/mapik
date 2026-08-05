import type { InferSelectModel, Table } from "drizzle-orm";
import {
  Mapper,
  type DeepConstraint,
  type Deepen,
  type FlatConstraint,
  type Flatten,
  type PropertyMap,
} from "./PropertyMap.js";

export class DrizzleTableMapper<
  T extends Table,
  const PM extends PropertyMap<keyof InferSelectModel<T>>,
> {
  protected readonly mapper: Mapper<PM>;

  constructor(
    readonly table: T,
    readonly propertyMap: PM,
  ) {
    this.mapper = new Mapper(this.propertyMap);

    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  flatten<D extends DeepConstraint<PM, InferSelectModel<T>>>(
    deep: D,
  ): Flatten<PM, D> {
    return this.mapper.flatten(deep);
  }

  deepen<F extends FlatConstraint<PM, InferSelectModel<T>>>(
    flat: F,
  ): Deepen<PM, F> {
    return this.mapper.deepen(flat);
  }
}

type GetTableMapper<
  TMs extends readonly DrizzleTableMapper<Table, any>[],
  T extends TMs[number]["table"],
> = { [K in keyof TMs]: T extends TMs[K]["table"] ? TMs[K] : never }[number];

export function createDrizzleMapper<
  const TMs extends readonly DrizzleTableMapper<Table, any>[],
>(tableMappers: TMs) {
  const tableMapperMap = new WeakMap(
    tableMappers.map((tableMapper) => [tableMapper.table, tableMapper]),
  );

  return <T extends TMs[number]["table"]>(table: T): GetTableMapper<TMs, T> => {
    const tableMapper = tableMapperMap.get(table);
    if (tableMapper === undefined)
      throw new Error(
        `No table mapper was registered for table ${
          table._.schema ? `${table._.schema}.` : ""
        }${table._.name}`,
      );
    return tableMapper as GetTableMapper<TMs, T>;
  };
}
