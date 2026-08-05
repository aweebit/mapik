export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

export type OptionalKeyOf<T, K extends keyof T = keyof T> = {
  [P in K]-?: {} extends Pick<T, P> ? P : never;
}[K];

// Doesn't include undefined for optional keys
export type DeclaredValueOf<T, K extends keyof T = keyof T> = Required<
  Pick<T, K>
>[K];

export type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};
