import { Codec, DeepFlat } from "./index.js";
import type { DeepRequired, IsAny } from "./utils/index.js";

export class MapikBase<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
  F extends DeepFlat.Constraint.Flat<DFM, D> = DeepFlat.Constraint.Flat<DFM, D>,
> {
  constructor(
    readonly codecMapper: Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    readonly deepFlatMapper: DeepFlat.MapperBase<DFM, D, F>,
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

  decode<X extends DeepFlat.Constraint.Flat<DFM, D>>(
    input: X,
  ): Codec.Decode<
    CM,
    // @ts-expect-error
    DeepFlat.Deepen<
      // no @ts-expect-error here
      DFM,
      X
    >,
    T,
    D
  > {
    return this.codecMapper.decode(this.deepFlatMapper.deepen(input) as any);
  }
}

export class Mapik<
  CM extends Codec.Map<T, D> = any,
  DFM extends DeepFlat.Map = DeepFlat.Map,
  T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
  D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
  F extends DeepFlat.Constraint.Flat<DFM, D> = DeepFlat.Constraint.Flat<DFM, D>,
> extends MapikBase<CM, DFM, T, D, F> {
  static makeFor<X>() {
    return new MapikFor<X>();
  }

  static makeFrom<const DFM extends DeepFlat.Map>(deepFlatMap: DFM) {
    return new MapikFrom(deepFlatMap);
  }

  static make<
    CM extends Codec.Map<T, D>,
    DFM extends DeepFlat.Map,
    T = IsAny<CM> extends true ? any : Codec.Infer.Type<CM>,
    D extends DeepFlat.Constraint.Deep<DFM> = DeepFlat.Constraint.Deep<DFM>,
    F extends DeepFlat.Constraint.Flat<DFM, D> = DeepFlat.Constraint.Flat<
      DFM,
      D
    >,
  >(
    codecMapper: Codec.Mapper<CM, T, IsAny<CM> extends true ? any : D>,
    deepFlatMapper: DeepFlat.MapperBase<DFM, D, F>,
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
    T = Codec.Infer.Encoded<M, X>,
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

  flatten<const DFM extends DeepFlat.Map.For<D>>(map: DFM) {
    const deepFlatMapper = new DeepFlat.Mapper<
      DeepRequired<DFM>,
      // @ts-expect-error
      D,
      DeepFlat.Constraint.Flat<
        DeepRequired<DFM>,
        // @ts-expect-error
        D
      >
    >(map);
    return new Mapik<
      CM,
      DeepRequired<DFM>,
      T,
      // @ts-expect-error
      D,
      DeepFlat.Constraint.Flat<
        DeepRequired<DFM>,
        // @ts-expect-error
        D
      >
    >(this.codecMapper, deepFlatMapper);
  }
}

export class MapikFrom<const M extends DeepFlat.Map> {
  constructor(private readonly map: M) {}

  flatten<
    D extends DeepFlat.Constraint.Deep<M, DeepFlat.Constraint.Flat<M, D>>,
  >() {
    return new MapikFrom2<M, D, DeepFlat.Constraint.Flat<M, D>>(
      new DeepFlat.Mapper(this.map),
    );
  }

  deepen<
    F extends DeepFlat.Constraint.Flat<M, DeepFlat.Constraint.Deep<M, F>>,
  >() {
    return new MapikFrom2<M, DeepFlat.Constraint.Deep<M, F>, F>(
      new DeepFlat.Mapper(this.map),
    );
  }
}

export class MapikFrom2<
  DFM extends DeepFlat.Map,
  D extends DeepFlat.Constraint.Deep<DFM, F>,
  F extends DeepFlat.Constraint.Flat<DFM, D>,
> {
  constructor(private readonly deepFlatMapper: DeepFlat.Mapper<DFM, D, F>) {}

  decode<const CM extends Codec.Map<T, D>, T = Codec.Infer.Type<CM, D>>(
    map: CM,
  ) {
    const codecMapper = new Codec.Mapper<CM, T, D>(map);
    return new Mapik<CM, DFM, T, D, F>(codecMapper, this.deepFlatMapper);
  }
}
