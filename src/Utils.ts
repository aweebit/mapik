import type {
  DeepRecord,
  PropagateRequired,
  Simplify,
  ValueOf,
  Writable,
} from "./utils/index.js";

export type IdentityMap<K extends PropertyKey> = { [P in K]: P } & {};

export const identityMap = <const Ks extends readonly PropertyKey[]>(
  keys: Ks,
) => {
  return Object.fromEntries(keys.map((key) => [key, key])) as IdentityMap<
    (typeof keys)[number]
  >;
};

export type DelimiterMap<
  D extends string,
  K extends PropertyKey,
> = DeepenAtDelimiter<D, IdentityMap<K>>;

export type DeepenAtDelimiter<
  D extends string,
  T extends Record<string, unknown>,
> = T extends unknown
  ? string extends keyof T
    ? DeepRecord<string, ValueOf<T>>
    : Simplify<
        Writable<T, Exclude<keyof T, `${string}${D}${string}`>> &
          PropagateRequired<{
            -readonly [K in keyof T as K extends `${infer A}${D}${string}`
              ? Exclude<A, keyof T>
              : never]: K extends `${infer A}${D}${string}`
              ? DeepenAtDelimiter<
                  D,
                  {
                    [K in keyof T as K extends `${A}${D}${infer B}`
                      ? B
                      : never]: T[K];
                  }
                >
              : never;
          }>
      >
  : never;

export type ValidateDeepenAtDelimiterInput<
  D extends string,
  T extends Record<string, unknown>,
  Then = T,
> = (
  [keyof T & string, keyof T & string] extends [infer K, infer J]
    ? K extends string
      ? J extends `${K}${D}${string}`
        ? unknown
        : never
      : never
    : never
) extends never
  ? Then
  : never;

export type CreateDeepenAtDelimiter<D extends string> = <
  T extends Record<string, unknown>,
>(
  flat: ValidateDeepenAtDelimiterInput<D, T>,
) => DeepenAtDelimiter<D, T>;

export const createDeepenAtDelimiter = <D extends string>(
  delimiter: D,
): CreateDeepenAtDelimiter<D> => {
  return <T extends Record<string, unknown>>(
    flat: ValidateDeepenAtDelimiterInput<D, T>,
  ): DeepenAtDelimiter<D, T> => {
    const deep: Record<string, unknown> = {};
    Object.entries(flat).forEach(([key, value]) => {
      const keyParts = key.split(delimiter).reverse();
      let target = deep;
      let keyPart = keyParts.pop()!;
      while (keyParts.length) {
        target = (target[keyPart] ??= {}) as Record<string, unknown>;
        keyPart = keyParts.pop()!;
      }
      target[keyPart] = value;
    });
    return deep as DeepenAtDelimiter<D, T>;
  };
};
