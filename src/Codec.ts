import {
  getOwnKeys,
  type IsAny,
  type MutuallyAssignable,
  type Simplify,
  type ValueOf,
} from "./utils/index.js";

export type Config<T = any, E = T> = {
  readonly decode: (input: E) => T;
  readonly encode: (input: T) => E;
};

const build = (config: Config<any, any>) => new Codec(config);
const codecFor = { decode: build, encode: build } as const;

export class Codec<T = any, E = T> implements Config<T, E> {
  // @ts-expect-error
  readonly #private: undefined;

  readonly decode: (input: E) => T;
  readonly encode: (input: T) => E;

  constructor({ decode, encode }: Config<T, E>) {
    this.decode = decode;
    this.encode = encode;
  }

  static makeFor<X>(): {
    readonly decode: <T>(config: Config<T, X>) => Codec<T, X>;
    readonly encode: <E>(config: Config<X, E>) => Codec<X, E>;
  } {
    return codecFor;
  }

  static make<T, E = T>(config: Config<T, E>) {
    return new Codec(config);
  }
}

export const makeFor = Codec.makeFor;
export const make = Codec.make;

export type Map<T = any, E = T> = MapInnerNode<T, E> | Codec<T, E>;

export type MapInnerNode<T = any, E = T> = T | E extends object
  ? MutuallyAssignable<keyof T, keyof E> extends true
    ? MapInnerNodeHelper<T, E>
    : never
  : never;

type MapInnerNodeHelper<
  T,
  E,
  Partition extends MapInnerNodePartition<T, E> = MapInnerNodePartition<T, E>,
> = Simplify<
  {
    readonly [K in Partition["required"]]: Map<ValueOf<T, K>, ValueOf<E, K>>;
  } & {
    readonly [K in Partition["optional"]]?: Map<ValueOf<T, K>, ValueOf<E, K>>;
  }
>;

type MapInnerNodePartition<T, E> = {
  [K in keyof T & keyof E]: MutuallyAssignable<
    ValueOf<T, K>,
    ValueOf<E, K>
  > extends true
    ? { required: never; optional: K }
    : { required: K; optional: never };
}[keyof T & keyof E];

export type MapCompletionHelper<T = any, E = T> = T | E extends object
  ? MutuallyAssignable<keyof T, keyof E> extends true
    ? MapCompletionHelperHelper<T, E>
    : never
  : never;

type MapCompletionHelperHelper<
  T,
  E,
  Partition extends MapInnerNodePartition<T, E> = MapInnerNodePartition<T, E>,
> = Simplify<
  {
    readonly [K in Partition["required"]]: MapCompletionHelper<
      ValueOf<T, K>,
      ValueOf<E, K>
    >;
  } & {
    readonly [K in Partition["optional"]]?: MapCompletionHelper<
      ValueOf<T, K>,
      ValueOf<E, K>
    >;
  }
>;

export type SideName = "Type" | "Encoded";

type PickSide<S extends SideName, T, E> = S extends "Type"
  ? T
  : S extends "Encoded"
    ? E
    : never;

export declare namespace Infer {
  type Side<S extends SideName, M extends Map | undefined, X = unknown> =
    IsAny<M> extends true
      ? any
      : M extends Codec<infer T, infer E>
        ? PickSide<S, T, E>
        : M extends MapInnerNode
          ? Simplify<
              Omit<X, keyof M> &
                (keyof X & keyof M extends infer K extends keyof X
                  ? { [P in K]: Side<S, M[K], ValueOf<X, K>> }
                  : never) &
                (Exclude<keyof M, keyof X> extends infer K extends PropertyKey
                  ? { readonly [P in K]?: Side<S, M[K]> }
                  : never)
            >
          : never;

  export type Type<M extends Map, E = unknown> = Side<"Type", M, E>;

  export type Encoded<M extends Map, T = unknown> = Side<"Encoded", M, T>;
}

export declare namespace Constraint {
  export type Side<S extends SideName, T, E, M extends Map<T, E>> =
    M extends Codec<T, E>
      ? PickSide<S, T, E>
      : M extends MapInnerNode<T, E>
        ? {
            readonly [K in keyof T & keyof E]?: K extends keyof M
              ? Side<
                  S,
                  ValueOf<T, K>,
                  ValueOf<E, K>,
                  // @ts-expect-error
                  ValueOf<
                    // no @ts-expect-error here
                    M,
                    K
                  >
                >
              : ValueOf<PickSide<S, T, E>, K>;
          }
        : never;

  export type Type<
    M extends Map<T, E>,
    T = Infer.Type<M>,
    E = Infer.Encoded<M>,
  > = Side<"Type", T, E, M>;

  export type Encoded<
    M extends Map<T, E>,
    T = Infer.Type<M>,
    E = Infer.Encoded<M>,
  > = Side<"Encoded", T, E, M>;
}

type Apply<
  S extends SideName,
  T,
  E,
  M extends Map<T, E>,
  X extends Constraint.Side<S, T, E, M>,
> =
  M extends Codec<T, E>
    ? PickSide<S, E, T>
    : M extends MapInnerNode<T, E>
      ? keyof X & keyof M & keyof T & keyof E extends infer K extends keyof X
        ? Simplify<
            {
              [P in K]: K extends keyof M & keyof T & keyof E
                ? Apply<
                    S,
                    ValueOf<T, K>,
                    ValueOf<E, K>,
                    // @ts-expect-error
                    ValueOf<
                      // no @ts-expect-error here
                      M,
                      K
                    >,
                    ValueOf<X, K>
                  >
                : never;
            } & Omit<X, K>
          >
        : never
      : never;

export type Decode<
  M extends Map<T, E>,
  X extends Constraint.Encoded<M, T, E>,
  T = Infer.Type<M>,
  E = Infer.Encoded<M>,
> = Apply<"Encoded", T, E, M, X>;

export type Encode<
  M extends Map<T, E>,
  X extends Constraint.Type<M, T, E>,
  T = Infer.Type<M>,
  E = Infer.Encoded<M>,
> = Apply<"Type", T, E, M, X>;

const mapperFor = {
  decode: (map: any) => new Mapper(map),
  encode: (map: any) => new Mapper(map),
} as const;

export class MapperBase<
  M extends Map<T, E> = any,
  T = Infer.Type<M>,
  E = Infer.Encoded<M>,
> {
  // @ts-expect-error
  #private: undefined;

  constructor(readonly map: M) {
    this.decode = this.decode.bind(this);
    this.encode = this.encode.bind(this);
  }

  decode<X extends Constraint.Encoded<M, T, E>>(input: X): Decode<M, X, T, E> {
    return this.transform("decode", input, this.map);
  }

  encode<X extends Constraint.Type<M, T, E>>(input: X): Encode<M, X, T, E> {
    return this.transform("encode", input, this.map);
  }

  protected transform(operation: "decode" | "encode", source: any, map: Map) {
    if (map instanceof Codec) return map[operation](source);
    const target: object = Object.create(Object.getPrototypeOf(source));
    const overwrites: Record<PropertyKey, unknown> = {};
    for (const key of getOwnKeys(map))
      overwrites[key] = this.transform(operation, source[key], map[key]!);
    return Object.assign(target, source, overwrites);
  }
}

export class Mapper<
  M extends Map<T, E> = any,
  T = Infer.Type<M>,
  E = Infer.Encoded<M>,
> extends MapperBase<M, T, E> {
  static makeFor<X>(): {
    readonly decode: {
      <M extends MapCompletionHelper<T, X>, T = Infer.Type<M, X>>(
        map: M & MapCompletionHelper<T, X>,
      ): Mapper<M, T, X>;
      <M extends Map<T, X>, T = Infer.Type<M, X>>(map: M): Mapper<M, T, X>;
    };
    readonly encode: {
      <M extends MapCompletionHelper<X, E>, E = Infer.Encoded<M, X>>(
        map: M & MapCompletionHelper<X, E>,
      ): Mapper<M, X, E>;
      <M extends Map<X, E>, E = Infer.Encoded<M, X>>(map: M): Mapper<M, X, E>;
    };
  } {
    return mapperFor;
  }

  static make<T, E>(): {
    <M extends MapCompletionHelper<T, E>>(
      map: M & MapCompletionHelper<T, E>,
    ): Mapper<M, T, E>;
    <M extends Map<T, E>>(map: M): Mapper<M, T, E>;
  };
  static make<M extends Map<T, E>, T = Infer.Type<M>, E = Infer.Encoded<M>>(
    map: M,
  ): Mapper<M, T, E>;
  static make<M extends Map<T, E>, T, E>(map?: M) {
    return map
      ? new Mapper<M, T, E>(map)
      : <M extends Map<T, E>>(map: M) => new Mapper<M, T, E>(map);
  }
}
