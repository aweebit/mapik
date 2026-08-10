import {
  getColumns,
  getTableUniqueName,
  type InferSelectModel,
  type Table,
  type TableConfig,
} from "drizzle-orm";
import { Mapper, type Constraint, type Map } from "../DeepFlat.js";
import { identityMap, type IdentityMap } from "../utils/index.js";

export * from "./EntityManager.js";

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
  T extends Table = Table,
  const M extends Map<keyof InferSelectModel<T>> = Map<
    keyof InferSelectModel<T>
  >,
> extends Mapper<
  M,
  Constraint.Deep<M, InferSelectModel<T>>,
  // @ts-expect-error
  InferSelectModel<// no @ts-expect-error here
  T>
> {
  constructor(
    readonly table: T,
    map: M,
  ) {
    super(map);
  }

  static override make<T extends Table>(table: T): TableMapper<T, MapToSelf<T>>;
  static override make<
    T extends Table,
    const M extends Map<keyof InferSelectModel<T>>,
  >(table: T, deriveMap: (identityMap: MapToSelf<T>) => M): TableMapper<T, M>;
  static override make<
    T extends Table,
    const M extends Map<keyof InferSelectModel<T>>,
  >(table: T, map: M): TableMapper<T, M>;
  static override make<
    T extends Table,
    const M extends Map<keyof InferSelectModel<T>>,
  >(table: T, map?: M | ((identityMap: MapToSelf<T>) => M)) {
    return new TableMapper(
      table,
      typeof map === "function"
        ? map(mapToSelf(table))
        : (map ?? mapToSelf(table)),
    );
  }
}

type GetTableMapper<
  TMs extends readonly TableMapper[],
  T extends TMs[number]["table"],
> = { [K in keyof TMs]: T extends TMs[K]["table"] ? TMs[K] : never }[number];

export function createMapper<const TMs extends readonly TableMapper[]>(
  tableMappers: TMs,
) {
  const tableMapperMap = new WeakMap(
    tableMappers.map((tableMapper) => [tableMapper.table, tableMapper]),
  );

  return <T extends TMs[number]["table"]>(table: T): GetTableMapper<TMs, T> => {
    const tableMapper = tableMapperMap.get(table);
    if (tableMapper === undefined) {
      throw new Error(
        `No table mapper was registered for table ${getTableUniqueName(table)}`,
      );
    }
    return tableMapper as GetTableMapper<TMs, T>;
  };
}
