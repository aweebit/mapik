import { IdentityMapper } from "./DeepFlat.js";
import { Codec, DeepFlat } from "./index.js";
import type { IdentityMap } from "./Utils.js";
import type { Simplify } from "./utils/index.js";

export class MapikBase<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
    DFM,
    DeepFlat.Constraint.Deep<DFM> & Codec.Infer.Encoded<CM>
  >,
  F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
    DeepFlat.Constraint.FlatFromDeep<DFM, D>,
> {
  readonly codecMapper: Codec.MapperBase<CM, T, D>;
  readonly deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>;

  constructor(
    codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
    deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>,
  ) {
    this.deepFlatMapper =
      deepFlatMapOrMapper instanceof DeepFlat.AbstractMapper
        ? deepFlatMapOrMapper
        : new DeepFlat.Mapper(deepFlatMapOrMapper);

    this.codecMapper =
      codecMapOrMapper instanceof Codec.MapperBase
        ? codecMapOrMapper
        : new Codec.Mapper(codecMapOrMapper);

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
  D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
    DFM,
    DeepFlat.Constraint.Deep<DFM> & Codec.Infer.Encoded<CM>
  >,
  F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
    DeepFlat.Constraint.FlatFromDeep<DFM, D>,
> extends MapikBase<CM, DFM, T, D, F> {
  static makeFor<X>(): Simplify<
    (X extends Record<PropertyKey, unknown>
      ? {
          readonly decode: <
            CM extends Codec.Map<T, X>,
            T = Codec.Infer.Type<CM, X>,
          >(
            codecMapOrMapper: CM | Codec.MapperBase<CM, T, X>,
          ) => MapikFor<CM, T, X>;
        }
      : unknown) & {
      encode: <
        CM extends Codec.Map<X, D>,
        D extends Record<PropertyKey, unknown> = Simplify<
          Record<PropertyKey, unknown> & Codec.Infer.Encoded<CM, X>
        >,
      >(
        codecMapOrMapper: CM | Codec.MapperBase<CM, X, D>,
      ) => MapikFor<CM, X, D>;
    }
  > {
    return mapikFor as any;
  }

  static makeFrom<const DFM extends DeepFlat.Map>(
    deepFlatMap: DFM,
  ): {
    readonly flatten: <D extends DeepFlat.Constraint.Deep<DFM>>() => MapikFrom<
      DFM,
      DeepFlat.Constraint.FlatFromDeep<DFM, D>
    >;
    readonly deepen: <F extends DeepFlat.Constraint.Flat<DFM>>() => MapikFrom<
      DFM,
      F
    >;
  };
  static makeFrom<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>): MapikFrom<DFM, F>;
  static makeFrom<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    if (deepFlatMapOrMapper instanceof DeepFlat.AbstractMapper)
      return new MapikFrom(deepFlatMapOrMapper);
    const transform = () => new MapikFrom(deepFlatMapOrMapper);
    return { flatten: transform, deepen: transform };
  }

  static make<T, F extends Record<PropertyKey, unknown>>(): <
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map<keyof F> = IdentityMap<keyof F>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
      DFM,
      DeepFlat.Constraint.DeepFromFlat<DFM, F> & Codec.Infer.Encoded<CM>
    >,
  >(
    codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
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
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
      DFM,
      DeepFlat.Constraint.Deep<DFM> & Codec.Infer.Encoded<CM>
    >,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
      DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
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
          codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
          deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>,
        ]
  ) {
    type Args = Exclude<typeof args, []>;
    const f = (...[codecMapOrMapper, deepFlatMapOrMapper]: Args) =>
      new Mapik(codecMapOrMapper, deepFlatMapOrMapper!);
    return args.length ? f(...args) : f;
  }
}

export const makeFor = Mapik.makeFor;
export const makeFrom = Mapik.makeFrom;
export const make = Mapik.make;

const mapikForTransform = (codecMapOrMapper: Codec.Map | Codec.MapperBase) =>
  new MapikFor(codecMapOrMapper);

const mapikFor = {
  decode: mapikForTransform,
  encode: mapikForTransform,
} as const;

class MapikFor<
  CM extends Codec.Map<T, D>,
  T,
  D extends Record<PropertyKey, unknown>,
> {
  constructor(
    private readonly codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
  ) {
    this.flatten = this.flatten.bind(this);
  }

  flatten<
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
    ...[deepFlatMapOrMapper]: IdentityMap<keyof D> extends DFM
      ? [deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>]
      : [deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>]
  ) {
    if (deepFlatMapOrMapper === undefined)
      deepFlatMapOrMapper =
        IdentityMapper.for() as typeof deepFlatMapOrMapper & {};
    return new Mapik<
      CM,
      DFM,
      T,
      // @ts-expect-error
      D,
      F
    >(this.codecMapOrMapper, deepFlatMapOrMapper);
  }
}

class MapikFrom<
  DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
> {
  constructor(
    private readonly deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>,
  ) {
    this.decode = this.decode.bind(this);
  }

  decode<
    CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(codecMapOrMapper: CM | Codec.MapperBase<CM, T, DeepFlat.Deepen<DFM, F>>) {
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
    >(codecMapOrMapper, this.deepFlatMapOrMapper);
  }
}
