export type UnionToIntersection<T> = (
  T extends unknown ? (x: T) => unknown : never
) extends (x: infer R) => unknown
  ? R
  : never;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type DeepSimplify<T> = { [K in keyof T]: DeepSimplify<T[K]> } & {};

export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

// Doesn't include undefined for optional keys
export type ValueOf<T, K extends keyof T = keyof T> = {
  [P in K]-?: T[P];
}[K];

export type OptionalKeyOf<T, K extends keyof T = keyof T> = {
  [P in K]-?: {} extends Pick<T, P> ? P : never;
}[K];

export type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};

export type PropagateRequired<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
> = PropagateRequiredHelper<T>;

type PropagateRequiredHelper<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
  K extends keyof T = keyof T,
  Partition extends { required: PropertyKey; optional: PropertyKey } =
    K extends unknown
      ? keyof ValueOf<T, K> extends OptionalKeyOf<ValueOf<T, K>>
        ? { optional: K; required: never }
        : { optional: never; required: K }
      : never,
> = Simplify<
  { [K in Partition["required"]]: ValueOf<T, K> } & {
    [K in Partition["optional"]]?: ValueOf<T, K>;
  }
>;
