import type {
  DeepSimplify,
  PropagateRequired,
  UnionToIntersection,
  ValueOf,
} from "./utils/index.js";

export type DeepenAtDelimiter<
  D extends string,
  T extends Record<string, unknown>,
> = DeepSimplify<
  {
    -readonly [K in keyof T as K extends `${string}${D}${string}`
      ? never
      : K]: T[K];
  } & PropagateRequired<{
    [K in keyof T as K extends `${infer A}${D}${string}`
      ? A
      : never]: UnionToIntersection<
      K extends `${string}${D}${infer B}`
        ? DeepenAtDelimiterHelper<Pick<T, K>, D, B, ValueOf<T, K>>
        : never
    > extends infer Result extends Record<string, unknown>
      ? Result
      : never;
  }>
>;

type DeepenAtDelimiterHelper<
  T extends Record<string, unknown>,
  D extends string,
  K extends string,
  V,
> = K extends `${infer A}${D}${infer B}`
  ? PropagateRequired<{ [P in A]: DeepenAtDelimiterHelper<T, D, B, V> }>
  : { -readonly [P in keyof T as K]: V };

type ValidateDeepenAtDelimiterInput<
  D extends string,
  T extends Record<string, unknown>,
> = (
  [keyof T & string, keyof T & string] extends [infer K, infer J]
    ? K extends string
      ? J extends `${K}${D}${string}`
        ? unknown
        : never
      : never
    : never
) extends never
  ? T
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
    flat: T,
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
