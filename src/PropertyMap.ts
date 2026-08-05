import type { Simplify, UnionToIntersection } from "effect/Types";

export type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};

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
    ? { readonly [P in PM]?: unknown }
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
  K extends keyof PM & keyof D & string = keyof PM & keyof D & string,
> = K extends unknown
  ? [PM[K], D[K]] extends [infer PMV, infer DV]
    ? PMV extends string
      ? { [P in PMV]: DV } // TODO: preserve readonly / (!!!) optionality
      : // { [P in keyof D as P extends K ? PMV : never]: DV }
        PMV extends PropertyMap
        ? DV extends PropertyMapDeepConstraint<PMV>
          ? PropertyMapFlattenHelper<PMV, DV>
          : never
        : never
    : never
  : never;

type Y = PropertyMapFlatten<
  { a: { b: "ab" }; c: "c"; nested: { value: "value" } },
  { a: { b: number }; c: {}; nested: {}; another: "one" }
>;

export type PropertyMapDeepen<
  PM extends PropertyMap,
  F extends PropertyMapFlatConstraint<PM>,
> = PM extends unknown
  ? F extends PropertyMapFlatConstraint<PM>
    ? PropertyMapDeepenHelper<PM, F>
    : never
  : never;

declare const $never: unique symbol;
type $never = typeof $never;

export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

type $neverKeys<T> = {
  [K in keyof T]: MutuallyAssignable<T[K], $never> extends true ? never : K;
}[keyof T];

type Remove$never<T, K extends keyof T = $neverKeys<T>> = {
  [P in K]: T[P];
};

type PropertyMapDeepenHelper<
  PM extends PropertyMap,
  F extends PropertyMapFlatConstraint<PM>,
> = Simplify<
  Remove$never<{
    // TODO: preserve readonly / (!!!) optionality
    -readonly [K in keyof PM & string]-?: PM[K] extends infer PMV
      ? PMV extends string
        ? F extends { readonly [P in PMV]?: infer Result }
          ? // better than F[PMV] because it doesn't add undefined when the
            // property is optional
            Result
          : $never
        : PMV extends PropertyMap
          ? F extends PropertyMapFlatConstraint<PMV>
            ? PropertyMapDeepenHelper<PMV, F> extends infer Result
              ? keyof Result extends never
                ? $never
                : Result
              : never
            : $never
          : $never
      : $never;
  }>
>;

type Z = PropertyMapDeepen<{ a: { b: "ab" }; c: "c" }, { ab?: never }>;

export type OptionalKeyOf<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// // This probably won't work because the property value types are affected

// type PropagateOptionalDown<T, OKey = OptionalKeyOf<T>> = {
//   [K in keyof T];
// };

// export type Callable = (...args: never) => unknown;

// export type DeepPartial<T> = T extends Callable | Date | RegExp
//   ? T
//   : T extends Map<infer K, infer V>
//     ? Map<DeepPartial<K>, DeepPartial<V>>
//     : T extends ReadonlyMap<infer K, infer V>
//       ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
//       : T extends Set<infer U>
//         ? Set<DeepPartial<U>>
//         : T extends ReadonlySet<infer U>
//           ? ReadonlySet<DeepPartial<U>>
//           : T extends readonly unknown[]
//             ? { [K in keyof T]: DeepPartial<T[K]> }
//             : T extends object
//               ? { [K in keyof T]?: DeepPartial<T[K]> }
//               : T;

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
