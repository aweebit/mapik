export type UnionToIntersection<T> = (
  T extends unknown ? (x: T) => unknown : never
) extends (x: infer R) => unknown
  ? R
  : never;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type DeepSimplify<T> = { [K in keyof T]: DeepSimplify<T[K]> } & {};

export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

export type IsAny<T> = 0 extends 1 & T ? true : false;

// Similar to T[K], but doesn't include undefined for optional keys
export type ValueOf<T, K extends keyof T = keyof T> = {
  [P in K]-?: T[P];
}[K];

export type OptionalKeyOf<T, K extends keyof T = keyof T> = {
  [P in K]-?: {} extends Pick<T, P> ? P : never;
}[K];

export type DeepReadonlyRecord<K extends PropertyKey, T> = {
  readonly [P in K]: T | DeepReadonlyRecord<K, T>;
};

export type PropagateRequired<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
> = PropagateRequiredHelper<T>;

type PropagateRequiredHelper<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
  K extends keyof T = keyof T,
  Partition extends { required: K; optional: K } = K extends unknown
    ? keyof ValueOf<T, K> extends OptionalKeyOf<ValueOf<T, K>>
      ? { optional: K; required: never }
      : { optional: never; required: K }
    : never,
> = Simplify<
  Required<Pick<T, Partition["required"]>> &
    Partial<Pick<T, Partition["optional"]>>
>;
