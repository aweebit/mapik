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

export type InferSelect<T extends Table | View> = keyof (T extends Table
  ? InferSelectModel<T>
  : T extends View
    ? InferSelectViewModel<T>
    : never);

export class Mapper<
  T extends Table | View = Table | View,
  M extends DeepFlat.Map<keyof IdentityMap<T>> = DeepFlat.Map<
    keyof IdentityMap<T>
  >,
> extends DeepFlat.AbstractMapper<
  M,
  DeepFlat.Constraint.Deep<M, InferSelect<T>>,
  // @ts-expect-error
  InferSelect<// no @ts-expect-error here
  T>
> {
  constructor(
    readonly source: T,
    protected readonly underlyingMapper: DeepFlat.AbstractMapper<
      M,
      DeepFlat.Constraint.Deep<M, InferSelect<T>>,
      // @ts-expect-error
      InferSelect<// no @ts-expect-error here
      T>
    >,
  ) {
    super();
  }

  static make<T extends Table | View>(source: T): Mapper<T>;
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
    const M extends DeepFlat.Map<keyof IdentityMap<T>>,
  >(source: T, map?: M | ((identityMap: IdentityMap<T>) => M)) {
    return new Mapper<T, M>(
      source,
      map === undefined
        ? (new DeepFlat.IdentityMapper() as any)
        : new DeepFlat.Mapper(
            typeof map === "function" ? map(identityMap(source)) : map,
          ),
    );
  }

  flatten<X extends DeepFlat.Constraint.Deep<M, InferSelect<T>>>(deep: X) {
    return this.underlyingMapper.flatten(deep);
  }

  deepen<
    X extends DeepFlat.Constraint.Flat<
      M,
      DeepFlat.Constraint.Deep<M, InferSelect<T>>
    >,
  >(flat: X) {
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
