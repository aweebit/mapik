import {
  getColumns,
  getTableUniqueName,
  is,
  Table,
  View,
  type InferSelectModel,
  type InferSelectViewModel,
} from "drizzle-orm";
import { MapperBase, type Constraint, type Map } from "../DeepFlat.js";
import { identityMap, type IdentityMap } from "../utils/index.js";

export * from "./EntityManager.js";

export type MapToSelf<T extends Table | View> = IdentityMap<
  keyof ReturnType<typeof getColumns<T>>
>;

export const mapToSelf = <T extends Table | View>(table: T): MapToSelf<T> => {
  return identityMap(
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
  const M extends Map<keyof MapToSelf<T>> = Map<keyof MapToSelf<T>>,
> extends MapperBase<
  M,
  Constraint.Deep<M, InferSelect<T>>,
  // @ts-expect-error
  InferSelect<// no @ts-expect-error here
  T>
> {
  constructor(
    readonly source: T,
    map: M,
  ) {
    super(map);
  }

  static make<T extends Table | View>(source: T): Mapper<T, MapToSelf<T>>;
  static make<T extends Table | View, const M extends Map<keyof MapToSelf<T>>>(
    source: T,
    deriveMap: (identityMap: MapToSelf<T>) => M,
  ): Mapper<T, M>;
  static make<T extends Table | View, const M extends Map<keyof MapToSelf<T>>>(
    source: T,
    map: M,
  ): Mapper<T, M>;
  static make<T extends Table | View, const M extends Map<keyof MapToSelf<T>>>(
    source: T,
    map?: M | ((identityMap: MapToSelf<T>) => M),
  ) {
    return new Mapper(
      source,
      typeof map === "function"
        ? map(mapToSelf(source))
        : (map ?? mapToSelf(source)),
    );
  }
}

export type MapperFor<
  Ms extends readonly Mapper[],
  T extends Ms[number]["source"],
> = {
  [K in keyof Ms]: T extends Ms[K]["source"] ? Ms[K] : never;
}[number];

export function createMapperFor<const Ms extends readonly Mapper[]>(
  mappers: Ms,
) {
  const mapperMap = new WeakMap(
    mappers.map((mapper) => [mapper.source, mapper]),
  );

  return <T extends Ms[number]["source"]>(source: T): MapperFor<Ms, T> => {
    const mapper = mapperMap.get(source);
    if (mapper === undefined) {
      const sourceKind = is(source, Table) ? "table" : "view";
      throw new Error(
        `No mapper was registered for ${sourceKind} ${getTableUniqueName(
          source,
        )}`,
      );
    }
    return mapper as MapperFor<Ms, T>;
  };
}
