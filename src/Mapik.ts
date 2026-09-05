import { Codec, DeepFlat } from "./index.js";
import type { IdentityMap } from "./Utils.js";
import type { Simplify, SimplifyReadonly } from "./utils/index.js";

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

const buildEncode = (codecMapOrMapper: Codec.Map | Codec.MapperBase) =>
  new EncodeBuilder(codecMapOrMapper);
const buildDecode = (
  deepFlatMapOrMapper: DeepFlat.Map | DeepFlat.AbstractMapper,
) => new DecodeBuilder(deepFlatMapOrMapper);

const mapikFor = {
  encode: buildEncode,
  flatten: buildDecode,
  deepen: buildDecode,
  decode: buildEncode,
} as const;

type MapikFor<X> = Simplify<
  {
    readonly encode: ([X] extends [object]
      ? {
          (codecMapOrMapper?: undefined): EncodeBuilder<
            // @ts-expect-error
            {},
            X,
            X
          >;
        }
      : unknown) & {
      <
        CM extends Codec.MapCompletionHelper<X, D>,
        D extends object = // @ts-expect-error
          Codec.Infer.Encoded<
            // no @ts-expect-error here
            CM,
            X
          >,
      >(
        codecMap: CM & Codec.MapCompletionHelper<X, D>,
      ): EncodeBuilder<CM, X, D>;
      <
        CM extends Codec.Map<X, D>,
        D extends object = // @ts-expect-error
          Codec.Infer.Encoded<
            // no @ts-expect-error here
            CM,
            X
          >,
      >(
        codecMap: CM,
      ): EncodeBuilder<CM, X, D>;
      <
        CM extends Codec.Map<X, D>,
        D extends object = // @ts-expect-error
          Codec.Infer.Encoded<
            // no @ts-expect-error here
            CM,
            X
          >,
      >(
        codecMapper: Codec.MapperBase<CM, X, D>,
      ): EncodeBuilder<CM, X, D>;
    };
  } & ([X] extends [object]
    ? {
        readonly flatten: {
          (
            deepFlatMapOrMapper?: undefined,
          ): DecodeBuilder<IdentityMap<keyof X>, X>;
          <const DFM extends DeepFlat.Map<PropertyKey, X>>(
            deepFlatMap: DFM,
          ): DecodeBuilder<DFM, SimplifyReadonly<DeepFlat.Flatten<DFM, X>>>;
          <DFM extends DeepFlat.Map<PropertyKey, X>>(
            deepFlatMapper: DeepFlat.AbstractMapper<
              DFM,
              SimplifyReadonly<DeepFlat.Flatten<DFM, X>>
            >,
          ): DecodeBuilder<DFM, SimplifyReadonly<DeepFlat.Flatten<DFM, X>>>;
        };
        readonly deepen: {
          (
            deepFlatMapOrMapper?: undefined,
          ): DecodeBuilder<IdentityMap<keyof X>, X>;
          <const DFM extends DeepFlat.Map<keyof X>>(
            deepFlatMap: DFM,
          ): DecodeBuilder<DFM, X>;
          <DFM extends DeepFlat.Map<keyof X>>(
            deepFlatMapper: DeepFlat.AbstractMapper<DFM, X>,
          ): DecodeBuilder<DFM, X>;
        };
        readonly decode: {
          (codecMapOrMapper?: undefined): EncodeBuilder<
            // @ts-expect-error
            {},
            X,
            X
          >;
          <
            CM extends Codec.MapCompletionHelper<T, X>,
            T = Codec.Infer.Type<CM, X>,
          >(
            codecMap: CM & Codec.MapCompletionHelper<T, X>,
          ): EncodeBuilder<CM, T, X>;
          <CM extends Codec.Map<T, X>, T = Codec.Infer.Type<CM, X>>(
            codecMap: CM,
          ): EncodeBuilder<CM, T, X>;
          <CM extends Codec.Map<T, X>, T = Codec.Infer.Type<CM, X>>(
            codecMapper: Codec.MapperBase<CM, T, X>,
          ): EncodeBuilder<CM, T, X>;
        };
      }
    : unknown)
>;

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
  static makeFor<X>(): MapikFor<X> {
    return mapikFor as any;
  }

  static makeFromDeepFlat<const DFM extends DeepFlat.Map>(
    deepFlatMap: DFM,
  ): FullDecodeBuilder<DFM, DeepFlat.Constraint.Flat<DFM>>;
  static makeFromDeepFlat<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>): FullDecodeBuilder<DFM, F>;
  static makeFromDeepFlat<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(deepFlatMapOrMapper: DeepFlat.AbstractMapper<DFM, F>) {
    return new FullDecodeBuilder(deepFlatMapOrMapper);
  }

  static makeFromCodec<
    CM extends Codec.Map<T, D>,
    T = Codec.Infer.Type<CM>,
    D extends object = // @ts-expect-error
      Codec.Infer.Encoded<// no @ts-expect-error here
      CM>,
  >(codecMap: CM): EncodeBuilder<CM, T, D>;
  static makeFromCodec<
    CM extends Codec.Map<T, D>,
    T = Codec.Infer.Type<CM>,
    D extends object = // @ts-expect-error
      Codec.Infer.Encoded<// no @ts-expect-error here
      CM>,
  >(codecMapper: Codec.Mapper<CM, T, D>): EncodeBuilder<CM, T, D>;
  static makeFromCodec<CM extends Codec.Map<T, D>, T, D extends object>(
    codecMapOrMapper: CM | Codec.Mapper<CM, T, D>,
  ): EncodeBuilder<CM, T, D> {
    return new EncodeBuilder(codecMapOrMapper);
  }

  static make(
    codecMapOrMapper?: undefined,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<{}, {}, {}, {}, {}>;
  static make<
    CM extends Codec.Map<T, D>,
    T = Codec.Infer.Type<CM>,
    D extends object = // @ts-expect-error
      Codec.Infer.Encoded<// no @ts-expect-error here
      CM>,
  >(
    codecMap: CM,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<CM, IdentityMap<keyof D>, T, D, D>;
  static make<
    CM extends Codec.Map<T, D>,
    T = Codec.Infer.Type<CM>,
    D extends object = // @ts-expect-error
      Codec.Infer.Encoded<// no @ts-expect-error here
      CM>,
  >(
    codecMapper: Codec.MapperBase<CM, T, D>,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<CM, IdentityMap<keyof D>, T, D, D>;
  static make<const DFM extends DeepFlat.Map>(
    codecMapOrMapper: undefined,
    deepFlatMap: DFM,
  ): Mapik<
    // @ts-expect-error
    {},
    DFM,
    DeepFlat.Deepen<DFM, DeepFlat.Constraint.Flat<DFM>>,
    DeepFlat.Deepen<DFM, DeepFlat.Constraint.Flat<DFM>>,
    DeepFlat.Constraint.Flat<DFM>
  >;
  static make<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(
    codecMapOrMapper: undefined,
    deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ): Mapik<
    // @ts-expect-error
    {},
    DFM,
    DeepFlat.Deepen<DFM, F>,
    DeepFlat.Deepen<DFM, F>,
    F
  >;
  static make<
    CM extends Codec.Map<T, D>,
    const DFM extends DeepFlat.Map,
    T = Codec.Infer.Type<CM>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
      DFM,
      DeepFlat.Constraint.Deep<DFM> & Codec.Infer.Encoded<CM>
    >,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
      DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(codecMap: CM, deepFlatMap: DFM): Mapik<CM, DFM, T, D, F>;
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
    codecMap: CM,
    deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ): Mapik<CM, DFM, T, D, F>;
  static make<
    CM extends Codec.Map<T, D>,
    const DFM extends DeepFlat.Map,
    T = Codec.Infer.Type<CM>,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F> = DeepFlat.DeepSimplify<
      DFM,
      DeepFlat.Constraint.Deep<DFM> & Codec.Infer.Encoded<CM>
    >,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
      DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapper: Codec.MapperBase<CM, T, D>,
    deepFlatMap: DFM,
  ): Mapik<CM, DFM, T, D, F>;
  static make<
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map,
    T,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapper: Codec.MapperBase<CM, T, D>,
    deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ): Mapik<CM, DFM, T, D, F>;
  static make<
    CM extends Codec.Map<T, D>,
    const DFM extends DeepFlat.Map,
    T,
    D extends DeepFlat.Constraint.DeepFromFlat<DFM, F>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapOrMapper?: CM | Codec.MapperBase<CM, T, D>,
    deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>,
  ) {
    if (deepFlatMapOrMapper === undefined)
      deepFlatMapOrMapper =
        DeepFlat.IdentityMapper.for() as unknown as DeepFlat.AbstractMapper<
          DFM,
          F
        >;
    return new Mapik(codecMapOrMapper ?? ({} as CM), deepFlatMapOrMapper!);
  }
}

export const { makeFor, makeFromDeepFlat, makeFromCodec, make } = Mapik;

class EncodeBuilder<CM extends Codec.Map<T, D>, T, D extends object> {
  constructor(
    private readonly codecMapOrMapper: CM | Codec.MapperBase<CM, T, D>,
  ) {
    this.flatten = this.flatten.bind(this);
  }

  flatten(
    deepFlatMapOrMapper?: undefined,
  ): Mapik<CM, IdentityMap<keyof D>, T, D, D>;
  flatten<const DFM extends DeepFlat.Map<PropertyKey, D>>(
    deepFlatMap: DFM,
  ): Mapik<CM, DFM, T, D, SimplifyReadonly<DeepFlat.Flatten<DFM, D>>>;
  flatten<
    DFM extends DeepFlat.Map<PropertyKey, D>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>): Mapik<CM, DFM, T, D, F>;
  flatten<
    DFM extends DeepFlat.Map<PropertyKey, D>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(deepFlatMapOrMapper?: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    if (deepFlatMapOrMapper === undefined)
      deepFlatMapOrMapper =
        DeepFlat.IdentityMapper.for() as unknown as DeepFlat.AbstractMapper<
          DFM,
          F
        >;
    return new Mapik<CM, DFM, T, D, F>(
      this.codecMapOrMapper,
      deepFlatMapOrMapper,
    );
  }
}

class DecodeBuilder<
  DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
> {
  constructor(
    private readonly deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>,
  ) {
    this.decode = this.decode.bind(this);
  }

  decode(codecMapOrMapper?: undefined): Mapik<
    // @ts-expect-error
    {},
    DFM,
    DeepFlat.Deepen<DFM, F>,
    DeepFlat.Deepen<DFM, F>,
    F
  >;
  decode<
    CM extends Codec.MapCompletionHelper<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(
    codecMap: CM & Codec.MapCompletionHelper<T, DeepFlat.Deepen<DFM, F>>,
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
  >;
  decode<
    CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(
    codecMap: CM,
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
  >;
  decode<
    CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(
    codecMapper: Codec.MapperBase<CM, T, DeepFlat.Deepen<DFM, F>>,
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
  >;
  decode<
    CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>> = // @ts-expect-error
      {},
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(codecMapOrMapper?: CM | Codec.MapperBase<CM, T, DeepFlat.Deepen<DFM, F>>) {
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
    >(codecMapOrMapper ?? ({} as CM), this.deepFlatMapOrMapper);
  }
}

class FullDecodeBuilder<
  DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
> extends DecodeBuilder<DFM, F> {
  constructor(deepFlatMapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    super(deepFlatMapOrMapper);
    this.flatten = this.flatten.bind(this);
    this.deepen = this.deepen.bind(this);
  }

  flatten<D extends DeepFlat.Constraint.DeepFromFlat<DFM, F>>(): DecodeBuilder<
    DFM,
    SimplifyReadonly<DeepFlat.Flatten<DFM, D>>
  > {
    return this as any;
  }

  deepen<FF extends F>(): DecodeBuilder<DFM, FF> {
    return this as any;
  }
}
