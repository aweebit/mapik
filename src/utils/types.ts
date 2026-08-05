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
