import {
  type DelimiterMap,
  type IdentityMap,
  type ValidateDeepenAtDelimiterInput,
} from "./Utils.js";
import {
  getOwnKeys,
  type HasRequiredKeys,
  type PropagateRequired,
  type Simplify,
  type SimplifyReadonly,
  type ValueOf,
} from "./utils/index.js";

export type Map<
  FlatKey extends PropertyKey = PropertyKey,
  D extends object = Record<PropertyKey, unknown>,
> = {
  readonly [K in keyof D]?:
    | FlatKey
    | Map<FlatKey, ValueOf<D, K> & Record<PropertyKey, unknown>>;
};

export type FlatKeyOf<
  M extends Map,
  D extends Constraint.Deep<M> = Constraint.Deep<M>,
> = {
  [K in keyof M & keyof D]: M[K] extends infer MV
    ? MV extends PropertyKey
      ? MV
      : MV extends Map
        ? D[K] extends infer DV
          ? DV extends Constraint.Deep<MV>
            ? FlatKeyOf<MV, DV>
            : never
          : never
        : never
    : never;
}[keyof M & keyof D];

export declare namespace Constraint {
  export type Flat<M extends Map> = {
    readonly [K in FlatKeyOf<M>]?: unknown;
  } & {};

  export type FlatFromFlat<M extends Map, F extends Flat<M>> = {
    readonly [K in keyof F]?: F[K];
  } & {};

  export type FlatFromDeep<M extends Map, D extends Deep<M>> = FlatFromFlat<
    M,
    Flatten<M, D>
  >;

  export type Deep<M extends Map> = {
    readonly [K in keyof M]?: M[K] extends infer MV
      ? MV extends PropertyKey
        ? unknown
        : MV extends Map
          ? Deep<MV>
          : never
      : never;
  } & {};

  export type DeepFromFlat<M extends Map, F extends Flat<M>> = {
    readonly [K in keyof M]?: M[K] extends infer MV
      ? MV extends PropertyKey
        ? ValueOf<F, MV & keyof F>
        : MV extends Map
          ? DeepFromFlat<MV, F>
          : never
      : never;
  } & {};
}

export type Flatten<
  M extends Map,
  D extends Constraint.Deep<M>,
  FK extends FlatKeyOf<M, D> = FlatKeyOf<M, D>,
> = [Map, PropertyKey] extends [M, keyof M]
  ? // Record<PropertyKey, unknown> breaks assignability to AbstractMapper
    // (likely related to https://github.com/microsoft/TypeScript/issues/58765)
    { [x: PropertyKey]: unknown }
  : Simplify<
      { [K in FK]: FlattenHelperRecur<M, D, K> } extends infer T extends {
        [K in FK]: [unknown, { required: K; optional: K }];
      }
        ? FlattenHelperPick<T, T[FK][1]["required"]> &
            Partial<FlattenHelperPick<T, T[FK][1]["optional"]>>
        : never
    >;

type FlattenHelperPick<
  T extends Record<PropertyKey, [unknown, unknown]>,
  K extends keyof T,
> = { [P in K]: T[P][0] };

type FlattenHelperRecur<
  M extends Map,
  D extends Constraint.Deep<M>,
  FK extends PropertyKey,
  O extends boolean = false, // inherited optionality
> = {
  [K in keyof M & keyof D]: M[K] extends infer MV
    ? MV extends FK
      ? [
          ValueOf<D, K>,
          FlattenHelperOptionality<D, K, O> extends true
            ? { required: never; optional: MV }
            : { required: MV; optional: never },
        ]
      : MV extends Map
        ? ValueOf<D, K> extends infer DV
          ? DV extends Constraint.Deep<MV>
            ? FlattenHelperRecur<MV, DV, FK, FlattenHelperOptionality<D, K, O>>
            : never
          : never
        : never
    : never;
}[keyof M & keyof D];

type FlattenHelperOptionality<
  D,
  K extends keyof D,
  O extends boolean,
> = O extends true ? O : HasRequiredKeys<Pick<D, K>> extends true ? O : true;

export type Deepen<M extends Map, F extends Constraint.Flat<M>> = [
  Map,
  PropertyKey,
] extends [M, keyof M]
  ? // Record<PropertyKey, unknown> breaks assignability to AbstractMapper
    // (likely related to https://github.com/microsoft/TypeScript/issues/58765)
    { [x: PropertyKey]: unknown }
  : Simplify<
      {
        -readonly [K in keyof F as MapFlatKeyBack<M, K>]: ValueOf<F, K>;
      } & PropagateRequired<
        RemoveRequiredNever<{
          -readonly [K in keyof M]-?: K extends MapFlatKeyBack<M, keyof F>
            ? never
            : M[K] extends infer MV
              ? MV extends Map
                ? F extends Constraint.Flat<MV>
                  ? Deepen<MV, F>
                  : never
                : never
              : never;
        }>
      >
    >;

type MapFlatKeyBack<M extends Map, FK extends PropertyKey> = {
  [K in keyof M]: M[K] extends infer MV ? (MV extends FK ? K : never) : never;
}[keyof M];

type KeyExceptRequiredNever<T> = {
  [K in keyof T]-?: T[K] extends never ? never : K;
}[keyof T];

type RemoveRequiredNever<T> = Pick<T, KeyExceptRequiredNever<T>>;

export type DeepSimplify<
  M extends Map,
  D extends Constraint.Deep<M>,
> = DeepSimplifyHelper<M, D> & {};

type DeepSimplifyHelper<
  M extends Map,
  D,
  K extends keyof D = keyof M & keyof D,
> = {
  [P in K]: M[P] extends infer MV
    ? MV extends Map
      ? DeepSimplifyHelper<MV, ValueOf<D, P>>
      : ValueOf<D, P>
    : never;
} & {};

export abstract class AbstractMapper<
  M extends Map = Map,
  F extends Constraint.Flat<M> = Constraint.Flat<M>,
> {
  // @ts-expect-error
  #variance?: {
    Map: M;
    Flat(_: F): never;
  };

  constructor() {
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  abstract flatten<X extends Constraint.DeepFromFlat<M, F>>(
    deep: X,
  ): Flatten<M, X>;
  abstract deepen<X extends Constraint.FlatFromFlat<M, F>>(
    flat: X,
  ): Deepen<M, X>;
}

export class MapperBase<
  const M extends Map = Map,
  F extends Constraint.Flat<M> = Constraint.Flat<M>,
> extends AbstractMapper<M, F> {
  constructor(readonly map: M) {
    super();
  }

  override flatten<X extends Constraint.DeepFromFlat<M, F>>(
    deep: X,
  ): Flatten<M, X> {
    const flat: Record<PropertyKey, unknown> = {};
    const process = (map: Map, deep: Record<PropertyKey, unknown>) => {
      for (const key of getOwnKeys(map)) {
        if (!(key in deep)) continue;
        const value = map[key]!;
        if (typeof value === "object")
          process(value, deep[key] as Record<PropertyKey, unknown>);
        else flat[value] = deep[key];
      }
    };
    process(this.map, deep);
    return flat as Flatten<M, X>;
  }

  override deepen<X extends Constraint.FlatFromFlat<M, F>>(
    flat: X,
  ): Deepen<M, X> {
    const process = (map: Map): Record<PropertyKey, unknown> => {
      const result: Record<PropertyKey, unknown> = {};
      for (const key of getOwnKeys(map)) {
        const value = map[key]!;
        if (typeof value === "object") {
          const deeper = process(value);
          if (Object.keys(deeper).length) result[key] = deeper;
        } else if (value in flat) {
          result[key] = flat[value as keyof typeof flat];
        }
      }
      return result;
    };
    return process(this.map) as Deepen<M, X>;
  }
}

const build = (map: Map) => new Mapper<any>(map);
const mapperFor = { flatten: build, deepen: build } as const;

export class Mapper<
  const M extends Map = Map,
  F extends Constraint.Flat<M> = Constraint.Flat<M>,
> extends MapperBase<M, F> {
  static makeFor<X extends object>(): {
    readonly flatten: <const M extends Map<PropertyKey, X>>(
      map: M,
    ) => Mapper<M, SimplifyReadonly<Flatten<M, X>>>;
    readonly deepen: <const M extends Map<keyof X>>(map: M) => Mapper<M, X>;
  } {
    return mapperFor;
  }

  static makeFrom<const M extends Map>(
    map: M,
  ): {
    flatten: <D extends Constraint.Deep<M>>() => Mapper<
      M,
      SimplifyReadonly<Flatten<M, D>>
    >;
    deepen: <F extends Constraint.Flat<M>>() => Mapper<M, F>;
  } {
    const build = () => new Mapper(map);
    return { flatten: build, deepen: build };
  }

  static make<
    const M extends Map,
    F extends Constraint.Flat<M> = Constraint.Flat<M>,
  >(map: M) {
    return new Mapper<M, F>(map);
  }
}

export class IdentityMapper<T extends object = object> extends AbstractMapper<
  IdentityMap<keyof T>,
  T
> {
  static #instance?: IdentityMapper;

  protected constructor() {
    super();
  }

  static for<T extends object>() {
    IdentityMapper.#instance ??= new IdentityMapper();
    return IdentityMapper.#instance as IdentityMapper<T>;
  }

  override flatten<X extends Constraint.DeepFromFlat<IdentityMap<keyof T>, T>>(
    deep: X,
  ): Flatten<IdentityMap<keyof T>, X> {
    return { ...deep } as any;
  }

  override deepen<X extends Constraint.FlatFromFlat<IdentityMap<keyof T>, T>>(
    flat: X,
  ): Deepen<IdentityMap<keyof T>, X> {
    return { ...flat } as any;
  }
}

export class AdHocDelimiterMapper<
  D extends string = string,
  T extends object = object,
> extends AbstractMapper<DelimiterMap<D, keyof T>, T> {
  protected constructor(readonly delimiter: D) {
    super();
  }

  static make<D extends string>(delimiter: D) {
    const mapper = new AdHocDelimiterMapper<D, any>(delimiter);
    return {
      for: <T extends object>(): ValidateDeepenAtDelimiterInput<
        D,
        T,
        AdHocDelimiterMapper<D, T>
      > => {
        return mapper;
      },
    };
  }

  override flatten<
    X extends Constraint.DeepFromFlat<DelimiterMap<D, keyof T>, T>,
  >(deep: X): Flatten<DelimiterMap<D, keyof T>, X> {
    const result: Record<PropertyKey, unknown> = {};
    const process = (deep: Record<PropertyKey, unknown>, pathKey = "") => {
      for (const key of Object.getOwnPropertyNames(deep)) {
        const fullKey = `${pathKey}_${key}`;
        const value = deep[key];
        if (
          typeof value === "object" &&
          value !== null &&
          !(value instanceof Date)
        ) {
          process(value as Record<PropertyKey, unknown>, fullKey);
        } else {
          result[fullKey.slice(1)] = value;
        }
      }
    };
    process(deep);
    return result as Flatten<DelimiterMap<D, keyof T>, X>;
  }

  override deepen<
    X extends Constraint.FlatFromFlat<DelimiterMap<D, keyof T>, T>,
  >(
    flat: ValidateDeepenAtDelimiterInput<D, X>,
  ): ValidateDeepenAtDelimiterInput<D, X, Deepen<DelimiterMap<D, keyof T>, X>> {
    const result: Record<PropertyKey, unknown> = {};
    for (const key of Object.getOwnPropertyNames(flat)) {
      const splitKey = key.split(this.delimiter);
      let target = result;
      let i = 0;
      let currentKey = splitKey[0]!;
      while (i < splitKey.length - 1) {
        target = (target[currentKey] ??= {}) as Record<PropertyKey, unknown>;
        currentKey = splitKey[++i]!;
      }
      target[currentKey] = flat[key as keyof X];
    }
    return result as Deepen<DelimiterMap<D, keyof T>, X>;
  }
}
