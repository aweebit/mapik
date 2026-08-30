export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type SimplifyReadonly<T> = { readonly [K in keyof T]: T[K] } & {};

export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type Writable<T, K extends keyof T = keyof T> = {
  -readonly [P in K]: T[P];
};

// Similar to T[K], but doesn't include undefined for optional keys
export type ValueOf<T, K extends keyof T = keyof T> = { [P in K]-?: T[P] }[K];

export type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};

export type HasRequiredKeys<T> = Partial<T> extends T ? false : true;

export type PropagateRequired<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
> = Simplify<
  Required<Pick<T, PropagateRequiredPartition<T>["required"]>> &
    Partial<Pick<T, PropagateRequiredPartition<T>["optional"]>>
>;

type PropagateRequiredPartition<
  T extends Record<PropertyKey, Record<PropertyKey, unknown>>,
> = {
  [K in keyof T]-?: HasRequiredKeys<ValueOf<T, K>> extends true
    ? { required: K; optional: never }
    : { required: never; optional: K };
}[keyof T];
