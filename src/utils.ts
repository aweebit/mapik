export type MutuallyAssignable<A, B> = [A, B] extends [B, A] ? true : false;

export type OptionalKeyOf<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Doesn't include undefined for optional keys
export type DeclaredValueOf<T, K extends keyof T = keyof T> = Required<
  Pick<T, K>
>[K];

// // Maybe this is better in terms of performance, maybe not. TODO: Investigate
// export type DeclaredValueOf<T, K extends keyof T = keyof T> = T extends {
//   readonly [P in K]?: infer Result;
// }
//   ? Result
//   : never;

export type DeepRecord<K extends PropertyKey, T> = {
  [P in K]: T | DeepRecord<K, T>;
};
