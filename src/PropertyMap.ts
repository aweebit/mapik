import type { Simplify, UnionToIntersection } from "effect/Types";
import type { DeepRecord, OptionalKeyOf, ValueOf } from "./utils/types.js";

// TODO: Allow symbols?
export type PropertyMap = DeepRecord<string, string>; // & DeepRecord<symbol, never>

// TODO: Should edges cases where empty objects appear in PM receive special
// treatment in the constraint types? (done?)
export type PropertyMapDeepConstraint<PM extends PropertyMap> =
  PropertyMapDeepConstraintHelper<PM>;

type PropertyMapDeepConstraintHelper<PM extends PropertyMap | string> =
  PM extends string
    ? unknown
    : PM extends PropertyMap
      ? PM[keyof PM & string] extends never
        ? never
        : Simplify<{
            readonly [K in keyof PM & string]?: PropertyMapDeepConstraintHelper<
              PM[K]
            >;
          }>
      : never;

export type PropertyMapFlatConstraint<PM extends PropertyMap> = Simplify<
  PropertyMapFlatConstraintHelper<PM>
>;

type PropertyMapFlatConstraintHelper<PM extends PropertyMap | string> =
  PM extends string
    ? { readonly [K in PM]?: unknown }
    : PM extends PropertyMap
      ? PM[keyof PM & string] extends never
        ? never
        : UnionToIntersection<
            {
              [K in keyof PM & string]: PropertyMapFlatConstraintHelper<PM[K]>;
            }[keyof PM & string]
          >
      : never;

type X = PropertyMapDeepConstraint<{
  a: { b: "ab" };
  c: "c";
}>;

// TODO: Preserve optionality + No undefined due to lookup!

export type PropertyMapFlatten<
  PM extends PropertyMap,
  D extends PropertyMapDeepConstraint<PM>,
> = PM extends unknown
  ? D extends PropertyMapDeepConstraint<PM>
    ? PropertyMapFlattenHelper<PM, D> extends never
      ? {}
      : Simplify<UnionToIntersection<PropertyMapFlattenHelper<PM, D>>>
    : never
  : never;

type PropertyMapFlattenHelper<
  PM extends PropertyMap,
  D extends PropertyMapDeepConstraint<PM>,
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
        ? DV extends PropertyMapDeepConstraint<PMV>
          ? PropertyMapFlattenHelper<PMV, DV, O | KO>
          : never
        : never
    : never;
}[keyof PM & keyof D & string];

type Y = PropertyMapFlatten<
  {
    a: { b: "ab" };
    c: { d: "cd" };
    r: { r: "rr" };
    f: "ff";
    nested: { value: "value" };
  },
  {
    a: { b?: {} };
    c?: { d: {} };
    r: { r: {} };
    f?: { r: {} };
    nested?: {};
    another?: {};
  }
>;

export type PropertyMapDeepen<
  PM extends PropertyMap,
  F extends PropertyMapFlatConstraint<PM>,
> = PM extends unknown
  ? F extends PropertyMapFlatConstraint<PM>
    ? PropertyMapDeepenHelper<PM, F>
    : never
  : never;

type KeyOfExceptRequiredNever<T> = {
  [K in keyof T]-?: T[K] extends never ? never : K;
}[keyof T];

type RemoveRequiredNever<T> = Pick<T, KeyOfExceptRequiredNever<T>>;

type TargetKey<PM extends PropertyMap, FK> = {
  [K in keyof PM & string]: PM[K] extends infer PMV
    ? PMV extends FK
      ? K
      : never
    : never;
}[keyof PM & string];

type PropertyMapDeepenHelper<
  PM extends PropertyMap,
  F extends PropertyMapFlatConstraint<PM>,
  FK extends keyof F = keyof F & PM[string],
> = Simplify<
  {
    -readonly [K in FK as TargetKey<PM, K>]: F[K];
  } & (RemoveRequiredNever<{
    [K in keyof PM & string]: PM[K] extends infer PMV
      ? PMV extends PropertyMap
        ? F extends PropertyMapFlatConstraint<PMV>
          ? PropertyMapDeepenHelper<PMV, F>
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

type Z = PropertyMapDeepen<
  { a: { b: "ab" }; r: { r: "rr" }; f: "ff" },
  { ab?: {}; rr: {}; ff?: { r: {} }; another?: {} }
>;

type ZZ = PropertyMapDeepen<{ a: { b: "ab"; c: "ac" } }, { ab?: {}; ac: {} }>;

function transformFromPropertyMap<const PM extends PropertyMap>(
  propertyMap: PM,
) {
  return {
    flatten: <I extends PropertyMapDeepConstraint<PM>>(
      input: I,
    ): PropertyMapFlatten<PM, I> => {
      const result: Record<string, unknown> = {};
      const process = (pm: PropertyMap, i: Record<string, unknown>) => {
        Object.entries(pm).forEach(([key, value]) => {
          if (typeof value === "string") result[value] = i[key];
          else process(value, i[key] as Record<string, unknown>);
        });
      };
      process(propertyMap, input);
      return result as PropertyMapFlatten<PM, I>;
    },
    deepen: <I extends PropertyMapFlatConstraint<PM>>(
      input: I,
    ): PropertyMapDeepen<PM, I> => {
      const process = (pm: PropertyMap): DeepRecord<string, unknown> => {
        return Object.fromEntries(
          Object.entries(pm).map(([key, value]) => [
            key,
            typeof value === "string" ? (input as any)[value] : process(value),
          ]),
        );
      };
      return process(propertyMap) as PropertyMapDeepen<PM, I>;
    },
  };
}

const transform = transformFromPropertyMap({ a: { b: "ab" }, c: "c" });
const res = transform.flatten({ a: { b: 123 }, c: false });
