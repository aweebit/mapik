import type {
  DeepReadonlyRecord,
  OptionalKeyOf,
  PropagateRequired,
  Simplify,
  UnionToIntersection,
  ValueOf,
} from "./utils/index.js";

export type Map<FlatKey extends PropertyKey = PropertyKey> = DeepReadonlyRecord<
  PropertyKey,
  FlatKey
>;

export type FlatKeyOf<M extends Map> = FlatKeyOfHelper<M> &
  (M extends Map<infer FlatKey> ? FlatKey : never);

type FlatKeyOfHelper<M extends Map | PropertyKey> = M extends PropertyKey
  ? M
  : M extends Map
    ? { [K in keyof M]: FlatKeyOfHelper<M[K]> }[keyof M]
    : never;

export type ValueForFlatKey<
  M extends Map,
  D extends Constraint.Deep<M>,
  FK extends FlatKeyOf<M>,
> = ValueForFlatKeyHelper<M, D, FK>;

type ValueForFlatKeyHelper<
  M extends Map | PropertyKey,
  D,
  FK extends PropertyKey,
> = M extends FK
  ? D
  : M extends Map
    ? D extends unknown // object? Record<PropertyKey, unknown>?
      ? {
          [K in keyof M & keyof D]: ValueForFlatKeyHelper<
            M[K],
            ValueOf<D, K>,
            FK
          >;
        }[keyof M & keyof D]
      : never
    : never;

export declare namespace Constraint {
  export type Flat<M extends Map, D extends Deep<M> = Deep<M>> = Simplify<{
    readonly [K in FlatKeyOf<M>]?: ValueForFlatKey<
      M,
      // Without & Deep<M>, fields not present in D end up having the never type
      D & Deep<M>,
      K
    >;
  }>;

  export type Deep<
    M extends Map,
    F extends { readonly [K in FlatKeyOf<M>]?: unknown } = {
      readonly [K in FlatKeyOf<M>]?: unknown;
    },
  > = DeepHelper<M, F>;

  type DeepHelper<
    M extends Map | PropertyKey,
    F extends Record<PropertyKey, unknown>,
  > = M extends PropertyKey
    ? ValueOf<F, M>
    : M extends Map
      ? { readonly [K in keyof M]?: DeepHelper<M[K], F> }
      : never;
}

export type Flatten<
  M extends Map,
  D extends Constraint.Deep<M>,
> = M extends unknown
  ? D extends unknown
    ? FlattenHelper<M, D> extends never
      ? {}
      : Simplify<UnionToIntersection<FlattenHelper<M, D>>>
    : never
  : never;

type FlattenHelper<
  M extends Map,
  D extends Constraint.Deep<M>,
  O extends boolean = false, // inherited optionality
> = {
  [K in keyof M & keyof D]: [
    M[K],
    ValueOf<D, K>, // somehow undefined doesn't mess things up
    // even without ValueOf ¯\_(ツ)_/¯ But we choose to not rely on that.
    K extends OptionalKeyOf<D, K> ? true : false,
  ] extends [infer MV, infer DV, infer KO extends boolean]
    ? MV extends PropertyKey
      ? true extends O | KO
        ? { [P in MV]?: DV }
        : { [P in MV]: DV }
      : MV extends Map
        ? DV extends Constraint.Deep<MV>
          ? FlattenHelper<MV, DV, O | KO>
          : never
        : never
    : never;
}[keyof M & keyof D];

export type Deepen<
  M extends Map,
  F extends Constraint.Flat<M>,
> = M extends unknown
  ? F extends unknown
    ? DeepenHelper<M, F>
    : never
  : never;

type KeyExceptRequiredNever<T> = {
  [K in keyof T]-?: T[K] extends never ? never : K;
}[keyof T];

type RemoveRequiredNever<T> = Pick<T, KeyExceptRequiredNever<T>>;

type MapFlatKeyBack<M extends Map, FK extends PropertyKey> = {
  [K in keyof M]: M[K] extends infer MV ? (MV extends FK ? K : never) : never;
}[keyof M];

type DeepenHelper<
  M extends Map,
  F extends Constraint.Flat<M>,
  FK extends keyof F = keyof F & M[keyof M],
> = Simplify<
  { -readonly [K in FK as MapFlatKeyBack<M, K>]: F[K] } & PropagateRequired<
    RemoveRequiredNever<{
      -readonly [K in keyof M]: M[K] extends infer MV
        ? MV extends Map
          ? F extends Constraint.Flat<MV>
            ? DeepenHelper<MV, F>
            : never
          : never
        : never;
    }>
  >
>;

export class MakeFrom<const M extends Map> {
  constructor(readonly map: M) {}

  flatten<D extends Constraint.Deep<M>>() {
    return new Mapper<M, D>(this.map);
  }

  deepen<F extends Constraint.Flat<M, Constraint.Deep<M, F>>>() {
    return new Mapper<M, Constraint.Deep<M, F>, F>(this.map);
  }
}

export class MapperBase<
  const M extends Map = Map,
  D extends Constraint.Deep<M> = Constraint.Deep<M>,
  F extends Constraint.Flat<M, D> = Constraint.Flat<M, D>,
> {
  // TODO: Currently no inference of D and F from subclass types

  constructor(readonly map: M) {
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  flatten<X extends Constraint.Deep<M, F>>(deep: X): Flatten<M, X> {
    const flat: Record<PropertyKey, unknown> = {};
    const process = (m: Map, d: Record<PropertyKey, unknown>) => {
      Object.entries(m).forEach(([key, value]) => {
        if (key in d) {
          if (typeof value === "object")
            process(value, d[key] as Record<PropertyKey, unknown>);
          else flat[value] = d[key];
        }
      });
    };
    process(this.map, deep);
    return flat as Flatten<M, X>;
  }

  deepen<X extends Constraint.Flat<M, D>>(flat: X): Deepen<M, X> {
    const process = (m: Map): Record<PropertyKey, unknown> => {
      return Object.entries(m).reduce<Record<PropertyKey, unknown>>(
        (d, [key, value]) => {
          if (typeof value === "object") {
            const deeper = process(value);
            if (Object.keys(deeper).length) d[key] = deeper;
          } else if (value in flat) d[key] = flat[value as keyof typeof flat];
          return d;
        },
        {},
      );
    };
    return process(this.map) as Deepen<M, X>;
  }
}

export class Mapper<
  const M extends Map = Map,
  D extends Constraint.Deep<M> = Constraint.Deep<M>,
  F extends Constraint.Flat<M, D> = Constraint.Flat<M, D>,
> extends MapperBase<M, D, F> {
  static makeFrom<const M extends Map>(map: M) {
    return new MakeFrom(map);
  }

  static make<
    const M extends Map,
    D extends Constraint.Deep<M> = Constraint.Deep<M>,
    F extends Constraint.Flat<M, D> = Constraint.Flat<M, D>,
  >(map: M) {
    return new Mapper<M, D, F>(map);
  }
}
