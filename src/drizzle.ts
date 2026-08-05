import {
  getColumns,
  type InferSelectModel,
  type Table,
  type TableConfig,
} from "drizzle-orm";
import {
  PropertyMapper,
  type DeepConstraint,
  type Deepen,
  type FlatConstraint,
  type Flatten,
  type PropertyMap,
} from "./PropertyMap.js";

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

export class DrizzleTableMapper<
  T extends Table,
  const PM extends PropertyMap<keyof InferSelectModel<T>>,
> {
  protected readonly mapper: PropertyMapper<PM>;

  protected constructor(
    readonly table: T,
    readonly propertyMap: PM,
  ) {
    this.mapper = new PropertyMapper(this.propertyMap);

    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  static make<T extends Table>(table: T): DrizzleTableMapper<T, MapToSelf<T>>;
  static make<
    T extends Table,
    const PM extends PropertyMap<keyof InferSelectModel<T>>,
  >(
    table: T,
    derivePropertyMap: (identityMap: MapToSelf<T>) => PM,
  ): DrizzleTableMapper<T, PM>;
  static make<
    T extends Table,
    const PM extends PropertyMap<keyof InferSelectModel<T>>,
  >(table: T, propertyMap: PM): DrizzleTableMapper<T, PM>;
  static make<
    T extends Table,
    const PM extends PropertyMap<keyof InferSelectModel<T>>,
  >(table: T, propertyMap?: PM | ((identityMap: MapToSelf<T>) => PM)) {
    return new DrizzleTableMapper(
      table,
      typeof propertyMap === "function"
        ? propertyMap(mapToSelf(table))
        : (propertyMap ?? mapToSelf(table)),
    );
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
