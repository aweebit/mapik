import {
  getColumns,
  getTableUniqueName,
  is,
  Table,
  View,
  type InferSelectModel,
  type InferSelectViewModel,
} from "drizzle-orm";
import { DeepFlat, Utils } from "../index.js";

export * from "./EntityManager.js";

export type IdentityMap<T extends Table | View> = Utils.IdentityMap<
  keyof ReturnType<typeof getColumns<T>>
>;

export const identityMap = <T extends Table | View>(
  table: T,
): IdentityMap<T> => {
  return Utils.identityMap(
    Object.keys(getColumns(table)) as Array<
      keyof ReturnType<typeof getColumns<T>>
    >,
  );
};

export type InferSelect<T extends Table | View> = T extends Table
  ? InferSelectModel<T>
  : T extends View
    ? InferSelectViewModel<T>
    : never;

export class Mapper<
  T extends Table | View = Table | View,
  M extends DeepFlat.Map<keyof IdentityMap<T>> = DeepFlat.Map<
    keyof IdentityMap<T>
  >,
> extends DeepFlat.AbstractMapper<M, InferSelect<T>> {
  constructor(
    readonly source: T,
    protected readonly underlyingMapper: DeepFlat.AbstractMapper<
      M,
      InferSelect<T>
    >,
  ) {
    super();
  }

  static make<T extends Table | View>(source: T): Mapper<T, IdentityMap<T>>;
  static make<
    T extends Table | View,
    const M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, deriveMap: (identityMap: IdentityMap<T>) => M): Mapper<T, M>;
  static make<
    T extends Table | View,
    const M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, map: M): Mapper<T, M>;
  static make<
    T extends Table | View,
    M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, map?: M | ((identityMap: IdentityMap<T>) => M)) {
    return new Mapper<T, M>(
      source,
      map === undefined
        ? (DeepFlat.IdentityMapper.for() as unknown as DeepFlat.AbstractMapper<
            M,
            InferSelect<T>
          >)
        : new DeepFlat.Mapper(
            typeof map === "function" ? map(identityMap(source)) : map,
          ),
    );
  }

  override flatten<
    X extends DeepFlat.Constraint.DeepFromFlat<M, InferSelect<T>>,
  >(deep: X): DeepFlat.Flatten<M, X> {
    return this.underlyingMapper.flatten(deep);
  }

  override deepen<
    X extends DeepFlat.Constraint.FlatFromFlat<M, InferSelect<T>>,
  >(flat: X): DeepFlat.Deepen<M, X> {
    return this.underlyingMapper.deepen(flat);
  }
}

export type ExtractMapper<
  M extends Mapper,
  T extends M["source"],
> = M extends unknown ? (T extends M["source"] ? M : never) : never;

export function createMapper<M extends Mapper>(mappers: readonly M[]) {
  const mapperMap = new WeakMap(
    mappers.map((mapper) => [mapper.source, mapper]),
  );

  return <T extends M["source"]>(source: T): ExtractMapper<M, T> => {
    const mapper = mapperMap.get(source);
    if (mapper === undefined) {
      const sourceKind = is(source, Table) ? "table" : "view";
      throw new Error(
        `No mapper was registered for ${sourceKind} ${getTableUniqueName(
          source,
        )}`,
      );
    }
    return mapper as ExtractMapper<M, T>;
  };
}
