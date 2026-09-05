import type { Table, View } from "drizzle-orm";
import { Codec, Mapik, type DeepFlat } from "../index.js";
import {
  createDeepenAtDelimiter,
  type DeepenAtDelimiter,
  type ValidateDeepenAtDelimiterInput,
} from "../Utils.js";
import { Drizzle } from "./index.js";

export namespace EntityMapper {
  export type Map<D extends string, T extends Table | View> = DeepenAtDelimiter<
    D,
    Drizzle.IdentityMap<T>
  >;

  export type IntermediateTypeConstraint<
    D extends string,
    T extends Table | View,
  > = DeepFlat.Constraint.DeepFromFlat<Map<D, T>, Drizzle.InferSelect<T>>;

  export type InferIntermediateType<
    D extends string,
    A,
    T extends Table | View,
    M extends Codec.Map,
    InferredB = Codec.Infer.Encoded<M, A>,
  > =
    IntermediateTypeConstraint<D, T> extends infer C extends
      IntermediateTypeConstraint<D, T>
      ? Codec.Constraint.Encoded<
          // @ts-expect-error
          M,
          A,
          InferredB
        > extends infer B extends C
        ? C extends B
          ? B
          : never
        : never
      : never;
}

export const createEntityMapperClass = <D extends string>(delimiter: D) => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  const makeDrizzleMapper = <T extends Table | View>(
    source: T,
  ): Drizzle.Mapper<T, EntityMapper.Map<D, T>> =>
    Drizzle.Mapper.make(source, deepenAtDelimiter);

  return class EntityMapper<
    A,
    T extends Table | View,
    M extends Codec.Map<A, B> = any,
    B extends EntityMapper.IntermediateTypeConstraint<D, T> =
      DeepFlat.DeepSimplify<
        EntityMapper.Map<D, T>,
        DeepFlat.Constraint.Deep<EntityMapper.Map<D, T>> &
          Codec.Infer.Encoded<M>
      >,
  > extends Mapik.MapikBase<
    M,
    EntityMapper.Map<D, T>,
    A,
    B,
    // @ts-expect-error
    Drizzle.InferSelect<// no @ts-expect-error here
    T>
  > {
    override readonly deepFlatMapper: Drizzle.Mapper<T, EntityMapper.Map<D, T>>;

    protected constructor(
      readonly source: ValidateDeepenAtDelimiterInput<
        D,
        Drizzle.IdentityMap<T>,
        T
      >,
      ...[codecMapOrMapper]: {} extends M
        ? [codecMapOrMapper?: M | Codec.MapperBase<M, A, B>]
        : [codecMapOrMapper: M | Codec.MapperBase<M, A, B>]
    ) {
      const deepFlatMapper = makeDrizzleMapper(source);
      super(codecMapOrMapper ?? ({} as M), deepFlatMapper);
      this.deepFlatMapper = deepFlatMapper;
    }

    static make<A>(): {
      <T extends Table | View>(
        source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
        ...rest: EntityMapper.InferIntermediateType<
          D,
          A,
          T,
          {},
          A
        > extends never
          ? [codecMapOrMapper: never]
          : [codecMapOrMapper?: undefined]
      ): EntityMapper<
        A,
        T,
        // @ts-expect-error
        {},
        A
      >;
      <
        T extends Table | View,
        M extends Codec.Map<A, B>,
        B extends EntityMapper.IntermediateTypeConstraint<D, T> =
          EntityMapper.InferIntermediateType<D, A, T, M>,
      >(
        source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
        codecMap: M,
      ): EntityMapper<A, T, M, B>;
      <
        T extends Table | View,
        M extends Codec.Map<A, B>,
        B extends EntityMapper.IntermediateTypeConstraint<D, T> =
          EntityMapper.InferIntermediateType<D, A, T, M>,
      >(
        source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
        codecMapper: Codec.MapperBase<M, A, B>,
      ): EntityMapper<A, T, M, B>;
    } {
      return <
        T extends Table | View,
        M extends Codec.Map<A, B>,
        B extends EntityMapper.IntermediateTypeConstraint<D, T> =
          EntityMapper.InferIntermediateType<D, A, T, M>,
      >(
        source: T,
        ...rest: {} extends M
          ? [codecMapOrMapper?: M | Codec.MapperBase<M, A, B>]
          : [codecMapOrMapper: M | Codec.MapperBase<M, A, B>]
      ) => new EntityMapper<A, T, M, B>(source, ...rest);
    }
  };
};
