import { IdentityMapper } from "./DeepFlat.js";
import { Codec, DeepFlat } from "./index.js";
import type { IdentityMap } from "./Utils.js";
import type { IsAny, Simplify } from "./utils/index.js";

export class MapikBase<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> =
    DeepFlat.Constraint.Deep<DFM>,
  F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
    DeepFlat.Constraint.FlatFromDeep<DFM, D>,
> {
  constructor(
    readonly codecMapper: Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    readonly deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ) {
    this.encode = this.encode.bind(this);
    this.decode = this.decode.bind(this);
  }

  encode<X extends Codec.Constraint.Type<CM, T, D>>(
    input: X,
  ): DeepFlat.Flatten<
    DFM,
    // @ts-expect-error
    Codec.Encode<
      // no @ts-expect-error here
      CM,
      X,
      T,
      D
    >
  > {
    return this.deepFlatMapper.flatten(this.codecMapper.encode(input) as any);
  }

  decode<X extends DeepFlat.Constraint.FlatFromFlat<DFM, F>>(
    input: DeepFlat.Deepen<DFM, X> extends Codec.Constraint.Encoded<CM, T, D>
      ? X
      : never,
  ): DeepFlat.Deepen<DFM, X> extends infer U extends Codec.Constraint.Encoded<
    CM,
    T,
    D
  >
    ? Codec.Decode<CM, U, T, D>
    : never {
    return this.codecMapper.decode(
      this.deepFlatMapper.deepen(input) as any,
    ) as any;
  }
}

export class Mapik<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> =
    DeepFlat.Constraint.Deep<DFM>,
  F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
    DeepFlat.Constraint.FlatFromDeep<DFM, D>,
> extends MapikBase<CM, DFM, T, D, F> {
  static makeFor<X>(): Simplify<
    (X extends Record<PropertyKey, unknown>
      ? {
          readonly decode: <
            const CM extends Codec.Map<T, X>,
            T = Codec.Infer.Type<CM, X>,
          >(
            codecMapOrMapper: CM | Codec.Mapper<CM, T, X>,
          ) => MapikFor2<CM, T, X>;
        }
      : unknown) & {
      encode: <
        const CM extends Codec.Map<X, D>,
        D extends Record<PropertyKey, unknown> = Simplify<
          Record<PropertyKey, unknown> & Codec.Infer.Encoded<CM, X>
        >,
      >(
        codecMapOrMapper: CM | Codec.Mapper<CM, X, D>,
      ) => MapikFor2<CM, X, D>;
    }
  > {
    return mapikFor as any;
  }

  static makeFrom<const DFM extends DeepFlat.Map>(
    deepFlatMap: DFM,
  ): {
    readonly flatten: <D extends DeepFlat.Constraint.Deep<DFM>>() => MapikFrom2<
      DFM,
      DeepFlat.Constraint.FlatFromDeep<DFM, D>
    >;
    readonly deepen: <F extends DeepFlat.Constraint.Flat<DFM>>() => MapikFrom2<
      DFM,
      F
    >;
  };
  static makeFrom<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>): MapikFrom2<DFM, F>;
  static makeFrom<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    if (deepFlatMapOrMapper instanceof DeepFlat.AbstractMapper)
      return mapikFrom2(deepFlatMapOrMapper);
    const transform = () => mapikFrom2(deepFlatMapOrMapper);
    return { flatten: transform, deepen: transform };
  }

  static make<T, F extends Record<PropertyKey, unknown>>(): <
    const CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map<keyof F> = IdentityMap<keyof F>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = Simplify<
      DeepFlat.Constraint.DeepFromFlat<DFM, F> & Codec.Infer.Encoded<CM>
    >,
  >(
    codecMapOrMapper:
      | CM
      | Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    ...rest: IdentityMap<keyof F> extends DFM
      ? [deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>]
      : [deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>]
  ) => Mapik<
    CM,
    DFM,
    T,
    D,
    // @ts-expect-error
    F
  >;
  static make<
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map,
    T = Codec.Infer.Type<CM>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> =
      DeepFlat.Constraint.Deep<DFM>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
      DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapOrMapper:
      | CM
      | Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>,
  ): Mapik<CM, DFM, T, D, F>;
  static make<
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map,
    T,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    ...args:
      | []
      | [
          codecMapOrMapper:
            | CM
            | Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
          deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>,
        ]
  ) {
    type Args = Exclude<typeof args, []>;
    const f = (...[codecMapOrMapper, deepFlatMapOrMapper]: Args) => {
      return mapikFor2(codecMapOrMapper).flatten(deepFlatMapOrMapper!);
    };
    return args.length ? f(...args) : f;
  }
}

export const makeFor = Mapik.makeFor;
export const makeFrom = Mapik.makeFrom;
export const make = Mapik.make;

const mapikForTransform = (codecMapOrMapper: Codec.Map | Codec.Mapper) =>
  mapikFor2(codecMapOrMapper);

const mapikFor = {
  decode: mapikForTransform,
  encode: mapikForTransform,
} as const;

type MapikFor2<
  CM extends Codec.Map<T, D>,
  T,
  D extends Record<PropertyKey, unknown>,
> = Simplify<{
  readonly flatten: {
    <
      const DFM extends DeepFlat.Map<PropertyKey, D> = IdentityMap<keyof D>,
      F extends DeepFlat.Constraint.FlatFromDeep<
        DFM,
        // @ts-expect-error
        D
      > = DeepFlat.Constraint.FlatFromDeep<
        DFM,
        // @ts-expect-error
        D
      >,
    >(
      ...rest: IdentityMap<keyof D> extends DFM
        ? [deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>]
        : [deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>]
    ): Mapik<
      CM,
      DFM,
      T,
      // @ts-expect-error
      D,
      F
    >;
  };
}>;

const mapikFor2 = <
  const CM extends Codec.Map<T, D>,
  T,
  D extends Record<PropertyKey, unknown>,
>(
  codecMapOrMapper: CM | Codec.Mapper<CM, T, D>,
): MapikFor2<CM, T, D> => {
  if (!(codecMapOrMapper instanceof Codec.Mapper))
    codecMapOrMapper = new Codec.Mapper(codecMapOrMapper);
  return {
    flatten: <
      const DFM extends DeepFlat.Map<PropertyKey, D>,
      F extends DeepFlat.Constraint.FlatFromDeep<
        DFM,
        // @ts-expect-error
        D
      >,
    >(
      deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>,
    ) => {
      if (deepFlatMapOrMapper === undefined)
        deepFlatMapOrMapper =
          IdentityMapper.for() as typeof deepFlatMapOrMapper & {};
      else if (!(deepFlatMapOrMapper instanceof DeepFlat.AbstractMapper))
        deepFlatMapOrMapper = new DeepFlat.Mapper(deepFlatMapOrMapper);
      return new Mapik<
        CM,
        DFM,
        T,
        // @ts-expect-error
        D,
        F
      >(codecMapOrMapper, deepFlatMapOrMapper);
    },
  };
};

type MapikFrom2<
  DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
> = Simplify<{
  readonly decode: <
    const CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(
    codecMapperOrMap: CM | Codec.Mapper<CM, T, DeepFlat.Deepen<DFM, F>>,
  ) => Mapik<
    CM,
    DFM,
    T,
    // @ts-expect-error
    DeepFlat.Deepen<
      // no @ts-expect-error here
      DFM,
      F
    >,
    F
  >;
}>;

const mapikFrom2 = <
  const DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
>(
  deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>,
): MapikFrom2<DFM, F> => {
  if (!(deepFlatMapOrMapper instanceof DeepFlat.AbstractMapper))
    deepFlatMapOrMapper = new DeepFlat.Mapper(deepFlatMapOrMapper);
  return {
    decode: (<
      const CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
      T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
    >(
      codecMapperOrMap: CM | Codec.Mapper<CM, T, DeepFlat.Deepen<DFM, F>>,
    ): Mapik<
      CM,
      DFM,
      T,
      // @ts-expect-error
      DeepFlat.Deepen<
        // no @ts-expect-error here
        DFM,
        F
      >,
      F
    > => {
      if (!(codecMapperOrMap instanceof Codec.Mapper))
        codecMapperOrMap = new Codec.Mapper<CM, T, DeepFlat.Deepen<DFM, F>>(
          codecMapperOrMap,
        );
      return new Mapik<
        CM,
        DFM,
        T,
        // @ts-expect-error
        DeepFlat.Deepen<
          // no @ts-expect-error here
          DFM,
          F
        >,
        F
      >(codecMapperOrMap, deepFlatMapOrMapper);
    }) as any, // TODO
  };
};
