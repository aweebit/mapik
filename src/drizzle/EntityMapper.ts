import type { Table, View } from "drizzle-orm";
import type { Codec } from "../index.js";
import {
  createDeepenAtDelimiter,
  type DeepenAtDelimiter,
  type ValidateDeepenAtDelimiterInput,
} from "../Utils.js";
import { Drizzle } from "./index.js";
import { Mapik } from "./Mapik.js";

export type DelimiterMap<
  D extends string,
  T extends Table | View,
> = DeepenAtDelimiter<D, Drizzle.IdentityMap<T>>;

export const createCreateEntityMapper = <D extends string>(delimiter: D) => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  return function createEntityMapper<A>(): {
    <T extends Table | View>(
      source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
      ...rest: Mapik.InferIntermediateType<
        T,
        // @ts-expect-error
        {},
        DelimiterMap<D, T>,
        A,
        A
      > extends never
        ? [codecMapOrMapper: never]
        : [codecMapOrMapper?: undefined]
    ): Mapik<
      T,
      // @ts-expect-error
      {},
      DelimiterMap<D, T>,
      A,
      A
    >;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      B extends Mapik.IntermediateTypeConstraint<T, DelimiterMap<D, T>> =
        Mapik.InferIntermediateType<T, CM, DelimiterMap<D, T>, A>,
    >(
      source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
      codecMap: CM,
    ): Mapik<T, CM, DelimiterMap<D, T>, A, B>;
    <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      B extends Mapik.IntermediateTypeConstraint<T, DelimiterMap<D, T>>,
    >(
      source: ValidateDeepenAtDelimiterInput<D, Drizzle.IdentityMap<T>, T>,
      codecMapper: Codec.MapperBase<CM, A, B>,
    ): Mapik<T, CM, DelimiterMap<D, T>, A, B>;
  } {
    return <
      T extends Table | View,
      CM extends Codec.Map<A, B>,
      B extends Mapik.IntermediateTypeConstraint<T, DelimiterMap<D, T>> =
        Mapik.InferIntermediateType<T, CM, DelimiterMap<D, T>, A>,
    >(
      source: T,
      codecMapOrMapper?: CM | Codec.MapperBase<CM, A, B>,
    ) => {
      return new Mapik<T, CM, DelimiterMap<D, T>, A, B>(
        source,
        codecMapOrMapper ?? ({} as CM),
        Drizzle.DeepFlatMapper.make(source, deepenAtDelimiter),
      );
    };
  };
};
