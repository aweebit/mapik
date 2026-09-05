import {
  getTableColumns,
  getTableUniqueName,
  getViewName,
  getViewSelectedFields,
  isTable,
  Table,
  View,
  type InferSelectModel,
  type InferSelectViewModel,
} from "drizzle-orm";
import { DeepFlat, Utils } from "../index.js";

export * from "./EntityMapper.js";
export * from "./Mapik.js";

const getColumns = <T extends Table | View>(source: T) =>
  (isTable(source)
    ? getTableColumns(source)
    : getViewSelectedFields(source)) as T extends Table
    ? ReturnType<typeof getTableColumns<T>>
    : T extends View
      ? ReturnType<typeof getViewSelectedFields<T>>
      : never;

export type IdentityMap<T extends Table | View> = Utils.IdentityMap<
  keyof ReturnType<typeof getColumns<T>>
>;

export const identityMap = <T extends Table | View>(
  source: T,
): IdentityMap<T> => {
  return Utils.identityMap(
    Object.keys(getColumns(source)) as Array<
      keyof ReturnType<typeof getColumns<T>>
    >,
  );
};

export type InferSelect<T extends Table | View> = T extends Table
  ? InferSelectModel<T>
  : T extends View
    ? InferSelectViewModel<T>
    : never;

export class DeepFlatMapper<
  T extends Table | View = Table | View,
  M extends DeepFlat.Map<keyof IdentityMap<T>> = DeepFlat.Map<
    keyof IdentityMap<T>
  >,
> extends DeepFlat.MapperBase<M, InferSelect<T>> {
  constructor(
    readonly source: T,
    map: M,
  ) {
    super(map);
  }

  static make<T extends Table | View>(
    source: T,
  ): DeepFlatMapper<T, IdentityMap<T>>;
  static make<
    T extends Table | View,
    const M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(
    source: T,
    deriveMap: (identityMap: IdentityMap<T>) => M,
  ): DeepFlatMapper<T, M>;
  static make<
    T extends Table | View,
    const M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, map: M): DeepFlatMapper<T, M>;
  static make<
    T extends Table | View,
    M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, map?: M | ((identityMap: IdentityMap<T>) => M)) {
    return new DeepFlatMapper<T, M>(
      source,
      typeof map === "function"
        ? map(identityMap(source))
        : (map ?? (identityMap(source) as unknown as M)),
    );
  }
}

export type ExtractMapper<
  M extends DeepFlatMapper,
  T extends M["source"],
> = M extends unknown ? (T extends M["source"] ? M : never) : never;

export function createMapper<M extends DeepFlatMapper>(mappers: readonly M[]) {
  const mapperMap = new WeakMap(
    mappers.map((mapper) => [mapper.source, mapper]),
  );

  return <T extends M["source"]>(source: T): ExtractMapper<M, T> => {
    const mapper = mapperMap.get(source);
    if (mapper === undefined) {
      const isSourceTable = isTable(source);
      const sourceKind = isSourceTable ? "table" : "view";
      const sourceName = isSourceTable
        ? getTableUniqueName(source)
        : getViewName(source);
      throw new Error(
        `No mapper was registered for ${sourceKind} ${sourceName}`,
      );
    }
    return mapper as ExtractMapper<M, T>;
  };
}
