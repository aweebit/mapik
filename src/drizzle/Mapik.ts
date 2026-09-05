import type { Table, View } from "drizzle-orm";
import { Codec, DeepFlat, Mapik as OriginalMapik } from "../index.js";
import { Drizzle } from "./index.js";

export namespace Mapik {
  export type DeepFlatMapper<
    T extends Table | View = Table | View,
    M extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>> = DeepFlat.Map<
      keyof Drizzle.IdentityMap<T>
    >,
  > = DeepFlat.MapperBase<M, Drizzle.InferSelect<T>>;

  export type IntermediateTypeConstraint<
    T extends Table | View,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
  > = DeepFlat.Constraint.DeepFromFlat<DFM, Drizzle.InferSelect<T>>;

  export type InferIntermediateType<
    T extends Table | View,
    CM extends Codec.Map<A, any>,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A,
    InferredB = Codec.Infer.Encoded<CM, A>,
  > =
    IntermediateTypeConstraint<T, DFM> extends infer C extends
      IntermediateTypeConstraint<T, DFM>
      ? Codec.Constraint.Encoded<CM, A, InferredB> extends infer B extends C
        ? C extends DeepFlat.DeepPartial<DFM, B>
          ? B
          : never
        : never
      : never;
}

export class MapikBase<
  T extends Table | View = Table | View,
  CM extends Codec.Map<A, B> = any,
  const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>> = DeepFlat.Map<
    keyof Drizzle.IdentityMap<T>
  >,
  A = Codec.Infer.Type<CM>,
  B extends Mapik.IntermediateTypeConstraint<T, DFM> =
    Mapik.InferIntermediateType<T, CM, DFM, A>,
> extends OriginalMapik.MapikBase<
  CM,
  DFM,
  A,
  B,
  // @ts-expect-error
  Drizzle.InferSelect<// no @ts-expect-error here
  T>
> {
  constructor(
    readonly source: T,
    codecMapOrMapper: CM | Codec.MapperBase<CM, A, B>,
    deepFlatMapOrMapper: DFM | Mapik.DeepFlatMapper<T, DFM>,
  ) {
    super(codecMapOrMapper, deepFlatMapOrMapper);
  }
}

export class Mapik<
  T extends Table | View = Table | View,
  CM extends Codec.Map<A, B> = any,
  const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>> = DeepFlat.Map<
    keyof Drizzle.IdentityMap<T>
  >,
  A = Codec.Infer.Type<CM>,
  B extends Mapik.IntermediateTypeConstraint<T, DFM> =
    Mapik.InferIntermediateType<T, CM, DFM, A>,
> extends MapikBase<T, CM, DFM, A, B> {
  static make<A>(): {
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      B extends Mapik.IntermediateTypeConstraint<T, Drizzle.IdentityMap<T>> =
        Mapik.InferIntermediateType<T, CM, Drizzle.IdentityMap<T>, A>,
    >(
      source: T,
      codecMap: CM,
      deepFlatMapOrMapper?: undefined,
    ): Mapik<T, CM, Drizzle.IdentityMap<T>, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      B extends Mapik.IntermediateTypeConstraint<T, Drizzle.IdentityMap<T>>,
    >(
      source: T,
      codecMapper: Codec.MapperBase<CM, A, B>,
      deepFlatMapOrMapper?: undefined,
    ): Mapik<T, CM, Drizzle.IdentityMap<T>, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM> =
        Mapik.InferIntermediateType<T, CM, DFM, A>,
    >(
      source: T,
      codecMap: CM,
      deepFlatMap: DFM,
    ): Mapik<T, CM, DFM, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM> =
        Mapik.InferIntermediateType<T, CM, DFM, A>,
    >(
      source: T,
      codecMap: CM,
      deepFlatMapper: Mapik.DeepFlatMapper<T, DFM>,
    ): Mapik<T, CM, DFM, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM>,
    >(
      source: T,
      codecMapper: Codec.MapperBase<CM, A, B>,
      deepFlatMap: DFM,
    ): Mapik<T, CM, DFM, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM>,
    >(
      source: T,
      codecMapper: Codec.MapperBase<CM, A, B>,
      deepFlatMapper: Mapik.DeepFlatMapper<T, DFM>,
    ): Mapik<T, CM, DFM, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM> =
        Mapik.InferIntermediateType<T, CM, DFM, A>,
    >(
      source: T,
      codecMapOrMapper: CM | Codec.MapperBase<CM, A, B>,
      deepFlatMapOrMapper: DFM | Mapik.DeepFlatMapper<T, DFM>,
    ): Mapik<T, CM, DFM, A, B>;
  };
  static make<T extends Table | View>(
    source: T,
    codecMapOrMapper?: undefined,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<
    T,
    // @ts-expect-error
    {},
    Drizzle.IdentityMap<T>,
    Drizzle.InferSelect<T>,
    Drizzle.InferSelect<T>
  >;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    A = Codec.Infer.Type<CM>,
    B extends Mapik.IntermediateTypeConstraint<T, Drizzle.IdentityMap<T>> =
      Mapik.InferIntermediateType<T, CM, Drizzle.IdentityMap<T>, A>,
  >(
    source: T,
    codecMap: CM,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<T, CM, Drizzle.IdentityMap<T>, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    A,
    B extends Mapik.IntermediateTypeConstraint<T, Drizzle.IdentityMap<T>>,
  >(
    source: T,
    codecMapper: Codec.MapperBase<CM, A, B>,
    deepFlatMapOrMapper?: undefined,
  ): Mapik<T, CM, Drizzle.IdentityMap<T>, A, B>;

  static make<
    T extends Table | View,
    const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
  >(
    source: T,
    codecMapOrMapper: undefined,
    deepFlatMap: DFM,
  ): Mapik<
    T,
    // @ts-expect-error
    {},
    DFM,
    DeepFlat.Deepen<DFM, Drizzle.InferSelect<T>>,
    DeepFlat.Deepen<DFM, Drizzle.InferSelect<T>>
  >;
  static make<
    T extends Table | View,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
  >(
    source: T,
    codecMapOrMapper: undefined,
    deepFlatMapper: Mapik.DeepFlatMapper<T, DFM>,
  ): Mapik<
    T,
    // @ts-expect-error
    {},
    DFM,
    DeepFlat.Deepen<DFM, Drizzle.InferSelect<T>>,
    DeepFlat.Deepen<DFM, Drizzle.InferSelect<T>>
  >;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A = Codec.Infer.Type<CM>,
    B extends Mapik.IntermediateTypeConstraint<T, DFM> =
      Mapik.InferIntermediateType<T, CM, DFM, A>,
  >(source: T, codecMap: CM, deepFlatMap: DFM): Mapik<T, CM, DFM, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A = Codec.Infer.Type<CM>,
    B extends Mapik.IntermediateTypeConstraint<T, DFM> =
      Mapik.InferIntermediateType<T, CM, DFM, A>,
  >(
    source: T,
    codecMap: CM,
    deepFlatMapper: Mapik.DeepFlatMapper<T, DFM>,
  ): Mapik<T, CM, DFM, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A,
    B extends Mapik.IntermediateTypeConstraint<T, DFM>,
  >(
    source: T,
    codecMapper: Codec.MapperBase<CM, A, B>,
    deepFlatMap: DFM,
  ): Mapik<T, CM, DFM, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A,
    B extends Mapik.IntermediateTypeConstraint<T, DFM>,
  >(
    source: T,
    codecMapper: Codec.MapperBase<CM, A, B>,
    deepFlatMapper: Mapik.DeepFlatMapper<T, DFM>,
  ): Mapik<T, CM, DFM, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    const DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A = Codec.Infer.Type<CM>,
    B extends Mapik.IntermediateTypeConstraint<T, DFM> =
      Mapik.InferIntermediateType<T, CM, DFM, A>,
  >(
    source: T,
    codecMapOrMapper: CM | Codec.MapperBase<CM, A, B>,
    deepFlatMapOrMapper: DFM | Mapik.DeepFlatMapper<T, DFM>,
  ): Mapik<T, CM, DFM, A, B>;
  static make<
    T extends Table | View,
    CM extends Codec.Map<A, B>,
    DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
    A,
    B extends Mapik.IntermediateTypeConstraint<T, DFM>,
  >(
    source?: T,
    codecMapOrMapper?: CM | Codec.MapperBase<CM, A, B>,
    deepFlatMapOrMapper?: DFM | Mapik.DeepFlatMapper<T, DFM>,
  ) {
    const make = <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      DFM extends DeepFlat.Map<keyof Drizzle.IdentityMap<T>>,
      B extends Mapik.IntermediateTypeConstraint<T, DFM>,
    >(
      source: T,
      codecMapOrMapper?: CM | Codec.MapperBase<CM, A, B>,
      deepFlatMapOrMapper?: DFM | Mapik.DeepFlatMapper<T, DFM>,
    ) => {
      return new Mapik<T, CM, DFM, A, B>(
        source,
        codecMapOrMapper ?? ({} as CM),
        deepFlatMapOrMapper ?? (Drizzle.identityMap(source) as unknown as DFM),
      );
    };
    return source ? make(source, codecMapOrMapper, deepFlatMapOrMapper) : make;
  }
}
