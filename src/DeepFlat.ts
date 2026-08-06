import type {
  DeepRecord,
  OptionalKeyOf,
  PropagateRequired,
  Simplify,
  UnionToIntersection,
  ValueOf,
} from "./utils/index.js";

export type Map<FlatKey extends PropertyKey = PropertyKey> = DeepRecord<
  PropertyKey,
  FlatKey
>;

export type FlatKeyOf<M extends Map> = FlatKeyOfHelper<M>;

type FlatKeyOfHelper<M extends Map | PropertyKey> = M extends PropertyKey
  ? M
  : M extends Map
    ? { [K in keyof M]: FlatKeyOfHelper<M[K]> }[keyof M]
    : never;

export declare namespace Constraint {
  export type Flat<M extends Map, D extends Deep<M> = Deep<M>> =
    Simplify<UnionToIntersection<FlatHelper<M, D>>> extends infer R extends {
      readonly [K in FlatKeyOf<M>]?: unknown;
    }
      ? R
      : never;

  type FlatHelper<M extends Map | PropertyKey, D> = M extends PropertyKey
    ? { readonly [K in M]?: D }
    : M extends Map
      ? {
          [K in keyof M]: FlatHelper<M[K], K extends keyof D ? D[K] : unknown>;
        }[keyof M]
      : never;

  /**
   * Beware that because of
   * https://github.com/microsoft/TypeScript/issues/63725, you will most likely
   * have to add a `@ts-expect-error` comment when passing a generic argument to
   * `F`.
   */
  export type Deep<
    M extends Map,
    F extends Flat<M> = // @ts-expect-error
      { readonly [K in FlatKeyOf<M>]?: unknown },
  > = DeepHelper<M, F>;

  type DeepHelper<
    M extends Map | PropertyKey,
    F extends Record<PropertyKey, unknown>,
  > = M extends PropertyKey
    ? ValueOf<F, M>
    : M extends Map
      ? Simplify<{ readonly [K in keyof M]?: DeepHelper<M[K], F> }>
      : never;
}

export type Flatten<
  M extends Map,
  D extends Constraint.Deep<M>,
> = M extends unknown
  ? D extends Constraint.Deep<M>
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
  ? F extends Constraint.Flat<M>
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
      [K in keyof M]: M[K] extends infer MV
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

  deepen<F extends Constraint.Flat<M>>() {
    return new Mapper<M, Constraint.Deep<M, F>, F>(this.map);
  }
}

export class Mapper<
  const M extends Map,
  D extends Constraint.Deep<M> = Constraint.Deep<M>,
  F extends Constraint.Flat<M, D> = Constraint.Flat<M, D>,
> {
  // TODO: Currently no inference of D and F from subclass types

  constructor(readonly map: M) {
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

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

  deepen<X extends Partial<F>>(
    flat: X,
  ): Deepen<
    M,
    // @ts-expect-error
    X
  > {
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
    return process(this.map) as Deepen<
      M,
      // @ts-expect-error
      X
    >;
  }
}
