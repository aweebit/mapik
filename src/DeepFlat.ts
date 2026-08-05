import type {
  DeepRecord,
  OptionalKeyOf,
  PropagateRequired,
  Simplify,
  UnionToIntersection,
  ValueOf,
} from "./utils/index.js";

// TODO: Allow symbols?
export type Map<FK extends PropertyKey = string> = DeepRecord<
  string,
  FK & string
>;

export type FlatKeyOf<M extends Map> = FlatKeyOfHelper<M>;

type FlatKeyOfHelper<M extends Map | string> = M extends string
  ? M
  : M extends Map
    ? { [K in keyof M & string]: FlatKeyOfHelper<M[K]> }[keyof M & string]
    : never;

export declare namespace Constraint {
  export type Deep<M extends Map, F extends Flat<M> = Flat<M>> = DeepHelper<
    M,
    F
  >;

  type DeepHelper<
    M extends Map | string,
    F extends Record<string, unknown>,
  > = M extends string
    ? ValueOf<F, M>
    : M extends Map
      ? Simplify<{
          readonly [K in keyof M & string]?: DeepHelper<M[K], F>;
        }>
      : never;

  export type Flat<
    M extends Map,
    F extends Flat<M> = { readonly [K in FlatKeyOf<M>]?: unknown },
  > = { readonly [K in FlatKeyOf<M>]?: ValueOf<F, K> };
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
  [K in keyof M & keyof D & string]: [
    M[K],
    ValueOf<D, K>, // somehow undefined doesn't mess things up
    // even without ValueOf ¯\_(ツ)_/¯ But we choose to not rely on that.
    K extends OptionalKeyOf<D, K> ? true : false,
  ] extends [infer MV, infer DV, infer KO extends boolean]
    ? MV extends string
      ? true extends O | KO
        ? { [P in MV]?: DV }
        : { [P in MV]: DV }
      : MV extends Map
        ? DV extends Constraint.Deep<MV>
          ? FlattenHelper<MV, DV, O | KO>
          : never
        : never
    : never;
}[keyof M & keyof D & string];

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

type MapFlatKeyBack<M extends Map, FK> = {
  [K in keyof M & string]: M[K] extends infer MV
    ? MV extends FK
      ? K
      : never
    : never;
}[keyof M & string];

type DeepenHelper<
  M extends Map,
  F extends Constraint.Flat<M>,
  FK extends keyof F = keyof F & M[string],
> = Simplify<
  {
    -readonly [K in FK as MapFlatKeyBack<M, K>]: F[K];
  } & PropagateRequired<
    RemoveRequiredNever<{
      [K in keyof M & string]: M[K] extends infer MV
        ? MV extends Map
          ? F extends Constraint.Flat<MV>
            ? DeepenHelper<MV, F>
            : never
          : never
        : never;
    }>
  >
>;

export class Mapper<const M extends Map> {
  constructor(readonly map: M) {
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  static make<const M extends Map>(map: M) {
    return new Mapper(map);
  }

  flatten<D extends Constraint.Deep<M>>(deep: D): Flatten<M, D> {
    const flat: Record<string, unknown> = {};
    const process = (m: Map, d: Record<string, unknown>) => {
      Object.entries(m).forEach(([key, value]) => {
        if (key in d) {
          if (typeof value === "string") flat[value] = d[key];
          else process(value, d[key] as Record<string, unknown>);
        }
      });
    };
    process(this.map, deep);
    return flat as Flatten<M, D>;
  }

  deepen<F extends Constraint.Flat<M>>(flat: F): Deepen<M, F> {
    const process = (m: Map): Record<string, unknown> => {
      return Object.entries(m).reduce<Record<string, unknown>>(
        (d, [key, value]) => {
          if (typeof value !== "string") {
            const deeper = process(value);
            if (Object.keys(deeper).length) d[key] = deeper;
          } else if (value in flat) d[key] = flat[value as keyof typeof flat];
          return d;
        },
        {},
      );
    };
    return process(this.map) as Deepen<M, F>;
  }
}
