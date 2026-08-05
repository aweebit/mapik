import type {
  DeepRecord,
  MutuallyAssignable,
  Simplify,
  ValueOf,
} from "./utils/types.js";

export class Transformation<T, E = T> {
  readonly #private: undefined;

  readonly decode: (input: E) => T;
  readonly encode: (input: T) => E;

  constructor({
    decode,
    encode,
  }: {
    decode: (input: E) => T;
    encode: (input: T) => E;
  }) {
    this.decode = decode;
    this.encode = encode;
  }

  static make<T, E>(config: {
    decode: (input: E) => T;
    encode: (input: T) => E;
  }) {
    return new Transformation(config);
  }
}

export type AnyTransformationMap =
  | Transformation<any>
  | DeepRecord<PropertyKey, Transformation<any>>;

export namespace Infer {
  export type Side<S extends SideName, TM extends AnyTransformationMap> =
    TM extends Transformation<infer T, infer E>
      ? PickSide<S, T, E>
      : TM extends DeepRecord<PropertyKey, Transformation<any>>
        ? { readonly [K in keyof TM]?: Side<S, TM[K]> }
        : never;

  export type Type<TM extends AnyTransformationMap> = Side<"Type", TM>;

  export type Encoded<TM extends AnyTransformationMap> = Side<"Encoded", TM>;
}

export type TransformationMap<T, E = T> =
  | Transformation<T, E>
  | NestedTransformations<T, E>;

export type NestedTransformations<T, E = T> = T | E extends object
  ? (() => never) extends T | E
    ? never
    : MutuallyAssignable<keyof T, keyof E> extends true
      ? NestedTransformationsHelper<T, E>
      : never
  : never;

type NestedTransformationsHelper<
  T,
  E,
  K extends keyof T & keyof E = keyof T & keyof E,
  Partition extends { required: K; optional: K } = K extends unknown
    ? MutuallyAssignable<ValueOf<T, K>, ValueOf<E, K>> extends true
      ? { optional: K; required: never }
      : { optional: never; required: K }
    : never,
> = Simplify<
  {
    readonly [P in Partition["required"]]: TransformationMap<
      ValueOf<T, P>,
      ValueOf<E, P>
    >;
  } & {
    readonly [P in Partition["optional"]]?: TransformationMap<
      ValueOf<T, P>,
      ValueOf<E, P>
    >;
  }
>;

export type SideName = "Type" | "Encoded";

type PickSide<S extends SideName, T, E> = S extends "Type"
  ? T
  : S extends "Encoded"
    ? E
    : never;

export namespace Constraint {
  export type Side<
    S extends SideName,
    T,
    E,
    TM extends AnyTransformationMap & TransformationMap<T, E>,
  > =
    TM extends Transformation<T, E>
      ? PickSide<S, T, E>
      : TM extends NestedTransformations<T, E>
        ? {
            readonly [K in keyof T & keyof E]?: K extends keyof TM
              ? Side<
                  S,
                  ValueOf<T, K>,
                  ValueOf<E, K>,
                  // @ts-expect-error
                  ValueOf<TM, K>
                >
              : ValueOf<PickSide<S, T, E>, K>;
          }
        : never;

  export type Type<
    TM extends AnyTransformationMap & TransformationMap<T, E>,
    T = Infer.Type<TM>,
    E = Infer.Encoded<TM>,
  > = Side<"Type", T, E, TM>;

  export type Encoded<
    TM extends AnyTransformationMap & TransformationMap<T, E>,
    T = Infer.Type<TM>,
    E = Infer.Encoded<TM>,
  > = Side<"Encoded", T, E, TM>;
}

type Apply<
  S extends SideName,
  T,
  E,
  TM extends AnyTransformationMap & TransformationMap<T, E>,
  X extends Constraint.Side<S, T, E, TM>,
> =
  TM extends Transformation<T, E>
    ? PickSide<S, E, T>
    : TM extends NestedTransformations<T, E>
      ? keyof X & keyof TM & keyof T & keyof E extends infer K extends keyof X
        ? Simplify<
            {
              [P in K]: K extends keyof TM & keyof T & keyof E
                ? Apply<
                    S,
                    ValueOf<T, K>,
                    ValueOf<E, K>,
                    // @ts-expect-error
                    ValueOf<TM, K>,
                    ValueOf<X, K>
                  >
                : never;
            } & Omit<X, K>
          >
        : never
      : never;

export type Encode<
  TM extends AnyTransformationMap & TransformationMap<T, E>,
  X extends Constraint.Type<TM, T, E>,
  T = Infer.Type<TM>,
  E = Infer.Encoded<TM>,
> = Apply<"Type", T, E, TM, X>;

export type Decode<
  TM extends AnyTransformationMap & TransformationMap<T, E>,
  X extends Constraint.Encoded<TM, T, E>,
  T = Infer.Type<TM>,
  E = Infer.Encoded<TM>,
> = Apply<"Encoded", T, E, TM, X>;

export class TransformationMapper<
  const TM extends AnyTransformationMap & TransformationMap<T, E>,
  T = Infer.Type<TM>,
  E = Infer.Encoded<TM>,
> {
  constructor(readonly transformationMap: TM) {}

  static make<
    const TM extends AnyTransformationMap & TransformationMap<T, E>,
    T = Infer.Type<TM>,
    E = Infer.Encoded<TM>,
  >(transformationMap: TM) {
    return new TransformationMapper<TM, T, E>(transformationMap);
  }

  decode<X extends Constraint.Encoded<TM, T, E>>(
    input: X,
  ): Decode<TM, X, T, E> {
    return this.transform("decode", input, this.transformationMap);
  }

  encode<X extends Constraint.Type<TM, T, E>>(input: X): Encode<TM, X, T, E> {
    return this.transform("encode", input, this.transformationMap);
  }

  protected transform(
    operation: "decode" | "encode",
    source: any,
    tm: AnyTransformationMap,
  ) {
    if (tm instanceof Transformation) return tm[operation](source);
    const target: object = Object.create(Object.getPrototypeOf(source));
    const overwrites: Record<PropertyKey, unknown> = {};
    const keys = [
      ...Object.getOwnPropertyNames(tm),
      ...Object.getOwnPropertySymbols(tm),
    ];
    for (const key of keys)
      overwrites[key] = this.transform(operation, source[key], tm[key]!);
    return Object.assign(target, source, overwrites);
  }
}

export const createTransformationMapper = <T, E = T>() => {
  return <const TM extends TransformationMap<T, E>>(transformationMap: TM) =>
    new TransformationMapper<TM, T, E>(transformationMap);
};
