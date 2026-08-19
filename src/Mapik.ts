import { Codec, DeepFlat } from "./index.js";
import type { IsAny } from "./utils/index.js";

export class MapikBase<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
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
    DFM, // @ts-expect-error
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
  T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
  F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
    DeepFlat.Constraint.FlatFromDeep<DFM, D>,
> extends MapikBase<CM, DFM, T, D, F> {
  static makeFor<X>() {
    return new MapikFor<X>();
  }

  static makeFrom<const DFM extends DeepFlat.Map>(map: DFM): MapikFrom<DFM>;
  static makeFrom<
    DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(mapper: DeepFlat.AbstractMapper<DFM, F>): MapikFrom2<DFM, F>;
  static makeFrom<
    const DFM extends DeepFlat.Map,
    F extends DeepFlat.Constraint.Flat<DFM>,
  >(mapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    return mapOrMapper instanceof DeepFlat.AbstractMapper
      ? new MapikFrom2(mapOrMapper)
      : new MapikFrom<DFM>(new DeepFlat.Mapper<DFM>(mapOrMapper));
  }

  static make<
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map,
    T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
    D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
    F extends DeepFlat.Constraint.FlatFromDeep<DFM, D> =
      DeepFlat.Constraint.FlatFromDeep<DFM, D>,
  >(
    codecMapper: Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ) {
    return new Mapik<CM, DFM, T, D, F>(codecMapper, deepFlatMapper);
  }
}

export const makeFor = Mapik.makeFor;
export const makeFrom = Mapik.makeFrom;
export const make = Mapik.make;

export class MapikFor<X> {
  decode<
    const M extends Codec.Map<
      T,
      X extends Record<PropertyKey, unknown> ? X : never
    >,
    T = Codec.Infer.Type<M, X>,
  >(map: M) {
    return new MapikFor2<
      M,
      T,
      X extends Record<PropertyKey, unknown> ? X : never
    >(new Codec.Mapper(map));
  }

  encode<
    const M extends Codec.Map<X, D>,
    D extends Record<PropertyKey, unknown> = Codec.Infer.Encoded<
      M,
      X
    > extends infer D extends Record<PropertyKey, unknown>
      ? D
      : never,
  >(map: M) {
    return new MapikFor2<M, X, D>(new Codec.Mapper(map));
  }
}

export class MapikFor2<
  CM extends Codec.Map<T, D>,
  T,
  D extends Record<PropertyKey, unknown>,
> {
  constructor(private readonly codecMapper: Codec.Mapper<CM, T, D>) {}

  flatten<const DFM extends DeepFlat.Map<PropertyKey, D>>(
    map: DFM,
  ): Mapik<
    CM,
    DFM,
    T,
    // @ts-expect-error
    D
  >;
  flatten<
    DFM extends DeepFlat.Map<PropertyKey, D>,
    F extends DeepFlat.Constraint.FlatFromDeep<
      DFM,
      // @ts-expect-error
      D
    >,
  >(
    mapper: DeepFlat.AbstractMapper<DFM, F>,
  ): Mapik<
    CM,
    DFM,
    T,
    // @ts-expect-error
    D,
    F
  >;
  flatten<
    DFM extends DeepFlat.Map<PropertyKey, D>,
    F extends DeepFlat.Constraint.FlatFromDeep<
      DFM,
      // @ts-expect-error
      D
    >,
  >(mapOrMapper: DFM | DeepFlat.AbstractMapper<DFM, F>) {
    const deepFlatMapper =
      mapOrMapper instanceof DeepFlat.AbstractMapper
        ? mapOrMapper
        : new DeepFlat.Mapper(mapOrMapper);
    return new Mapik<
      CM,
      DFM,
      T,
      // @ts-expect-error
      D,
      F
    >(this.codecMapper, deepFlatMapper);
  }
}

export class MapikFrom<const M extends DeepFlat.Map> {
  constructor(private readonly mapper: DeepFlat.AbstractMapper<M>) {}

  flatten<D extends DeepFlat.Constraint.Deep<M>>() {
    return new MapikFrom2<M, DeepFlat.Constraint.FlatFromDeep<M, D>>(
      this.mapper,
    );
  }

  deepen<F extends DeepFlat.Constraint.Flat<M>>() {
    return new MapikFrom2<M, F>(this.mapper);
  }
}

export class MapikFrom2<
  DFM extends DeepFlat.Map,
  F extends DeepFlat.Constraint.Flat<DFM>,
> {
  constructor(
    private readonly deepFlatMapper: DeepFlat.AbstractMapper<DFM, F>,
  ) {}

  decode<
    const CM extends Codec.Map<T, DeepFlat.Deepen<DFM, F>>,
    T = Codec.Infer.Type<CM, DeepFlat.Deepen<DFM, F>>,
  >(
    map: CM,
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
  > {
    const codecMapper = new Codec.Mapper<CM, T, DeepFlat.Deepen<DFM, F>>(map);
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
    >(codecMapper, this.deepFlatMapper);
  }
}
