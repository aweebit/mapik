import type { Simplify, UnionToIntersection } from "effect/Types";
import type { DeepRecord, OptionalKeyOf, ValueOf } from "./utils/types.js";

// TODO: Allow symbols?
export type PropertyMap = DeepRecord<string, string>; // & DeepRecord<symbol, never>

export type FlatKeyOf<PM extends PropertyMap> = FlatKeyOfHelper<PM>;

type FlatKeyOfHelper<PM extends PropertyMap | string> = PM extends string
  ? PM
  : PM extends PropertyMap
    ? { [K in keyof PM & string]: FlatKeyOfHelper<PM[K]> }[keyof PM & string]
    : never;

export type DeepConstraint<PM extends PropertyMap> = DeepConstraintHelper<PM>;

type DeepConstraintHelper<PM extends PropertyMap | string> = PM extends string
  ? unknown
  : PM extends PropertyMap
    ? Simplify<{
        readonly [K in keyof PM & string]?: DeepConstraintHelper<PM[K]>;
      }>
    : never;

export type FlatConstraint<PM extends PropertyMap> = {
  readonly [K in FlatKeyOf<PM>]?: unknown;
};

export type Flatten<
  PM extends PropertyMap,
  D extends DeepConstraint<PM>,
> = PM extends unknown
  ? D extends DeepConstraint<PM>
    ? FlattenHelper<PM, D> extends never
      ? {}
      : Simplify<UnionToIntersection<FlattenHelper<PM, D>>>
    : never
  : never;

type FlattenHelper<
  PM extends PropertyMap,
  D extends DeepConstraint<PM>,
  O extends boolean = false, // inherited optionality
> = {
  [K in keyof PM & keyof D & string]: [
    PM[K],
    ValueOf<D, K>, // somehow undefined doesn't mess things up
    // even without ValueOf ¯\_(ツ)_/¯ But we choose to not rely on that.
    K extends OptionalKeyOf<D, K> ? true : false,
  ] extends [infer PMV, infer DV, infer KO extends boolean]
    ? PMV extends string
      ? true extends O | KO
        ? { [P in PMV]?: DV }
        : { [P in PMV]: DV }
      : PMV extends PropertyMap
        ? DV extends DeepConstraint<PMV>
          ? FlattenHelper<PMV, DV, O | KO>
          : never
        : never
    : never;
}[keyof PM & keyof D & string];

export type Deepen<
  PM extends PropertyMap,
  F extends FlatConstraint<PM>,
> = PM extends unknown
  ? F extends FlatConstraint<PM>
    ? DeepenHelper<PM, F>
    : never
  : never;

type KeyOfExceptRequiredNever<T> = {
  [K in keyof T]-?: T[K] extends never ? never : K;
}[keyof T];

type RemoveRequiredNever<T> = Pick<T, KeyOfExceptRequiredNever<T>>;

type MapFlatKeyBack<PM extends PropertyMap, FK> = {
  [K in keyof PM & string]: PM[K] extends infer PMV
    ? PMV extends FK
      ? K
      : never
    : never;
}[keyof PM & string];

type DeepenHelper<
  PM extends PropertyMap,
  F extends FlatConstraint<PM>,
  FK extends keyof F = keyof F & PM[string],
> = Simplify<
  {
    -readonly [K in FK as MapFlatKeyBack<PM, K>]: F[K];
  } & (RemoveRequiredNever<{
    [K in keyof PM & string]: PM[K] extends infer PMV
      ? PMV extends PropertyMap
        ? F extends FlatConstraint<PMV>
          ? DeepenHelper<PMV, F>
          : never
        : never
      : never;
  }> extends infer Result
    ? { [K in ExtractKeysToRequire<Result>]: Result[K] } & {
        [K in Exclude<keyof Result, ExtractKeysToRequire<Result>>]?: Result[K];
      }
    : never)
>;

type ExtractKeysToRequire<T> = {
  [K in keyof T]-?: keyof T[K] extends OptionalKeyOf<T[K]> ? never : K;
}[keyof T];

export class Mapper<const PM extends PropertyMap> {
  constructor(readonly propertyMap: PM) {
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  flatten<D extends DeepConstraint<PM>>(deep: D): Flatten<PM, D> {
    const flat: Record<string, unknown> = {};
    const process = (pm: PropertyMap, d: Record<string, unknown>) => {
      Object.entries(pm).forEach(([key, value]) => {
        if (key in d) {
          if (typeof value === "string") flat[value] = d[key];
          else process(value, d[key] as Record<string, unknown>);
        }
      });
    };
    process(this.propertyMap, deep);
    return flat as Flatten<PM, D>;
  }

  deepen<F extends FlatConstraint<PM>>(flat: F): Deepen<PM, F> {
    const process = (pm: PropertyMap): Record<string, unknown> => {
      return Object.entries(pm).reduce<Record<string, unknown>>(
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
    return process(this.propertyMap) as Deepen<PM, F>;
  }
}
