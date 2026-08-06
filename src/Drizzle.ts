import {
  getColumns,
  type InferSelectModel,
  type Table,
  type TableConfig,
} from "drizzle-orm";
import {
  Mapper,
  type Constraint,
  type Deepen,
  type Flatten,
  type Map,
} from "./DeepFlat.js";

type IdentityMap<K extends PropertyKey> = { [P in K]: P } & {};

const identityMap = <const Ks extends readonly PropertyKey[]>(keys: Ks) => {
  return Object.fromEntries(keys.map((key) => [key, key])) as IdentityMap<
    (typeof keys)[number]
  >;
};

export type MapToSelf<T extends Table> = IdentityMap<
  keyof (T extends Table<TableConfig<infer TColumns>> ? TColumns : never) &
    string
> & {};

export const mapToSelf = <T extends Table>(table: T): MapToSelf<T> => {
  return identityMap(
    Object.keys(getColumns(table)) as Array<keyof InferSelectModel<T>>,
  );
};

export class TableMapper<
  T extends Table,
  const M extends Map<keyof InferSelectModel<T>>,
> {
  protected readonly mapper: Mapper<M>;

  protected constructor(
    readonly table: T,
    readonly map: M,
  ) {
    this.mapper = new Mapper(map);

    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  static make<T extends Table>(table: T): TableMapper<T, MapToSelf<T>>;
  static make<T extends Table, const M extends Map<keyof InferSelectModel<T>>>(
    table: T,
    derivePropertyMap: (identityMap: MapToSelf<T>) => M,
  ): TableMapper<T, M>;
  static make<T extends Table, const M extends Map<keyof InferSelectModel<T>>>(
    table: T,
    propertyMap: M,
  ): TableMapper<T, M>;
  static make<T extends Table, const M extends Map<keyof InferSelectModel<T>>>(
    table: T,
    propertyMap?: M | ((identityMap: MapToSelf<T>) => M),
  ) {
    return new TableMapper(
      table,
      typeof propertyMap === "function"
        ? propertyMap(mapToSelf(table))
        : (propertyMap ?? mapToSelf(table)),
    );
  }

  flatten<
    D extends Constraint.Deep<
      M,
      // @ts-expect-error
      InferSelectModel<T>
    >,
  >(deep: D): Flatten<M, D> {
    return this.mapper.flatten(deep);
  }

  deepen<F extends Partial<InferSelectModel<T>>>(flat: F): Deepen<M, F> {
    return this.mapper.deepen(flat as any) as any;
  }
}

type GetTableMapper<
  TMs extends readonly TableMapper<Table, any>[],
  T extends TMs[number]["table"],
> = { [K in keyof TMs]: T extends TMs[K]["table"] ? TMs[K] : never }[number];

export function createMapper<
  const TMs extends readonly TableMapper<Table, any>[],
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
