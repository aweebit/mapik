import type { Table, View } from "drizzle-orm";
import { Codec, Mapik, type DeepFlat } from "../index.js";
import { createDeepenAtDelimiter, type DeepenAtDelimiter } from "../Utils.js";
import { Drizzle } from "./index.js";

export namespace EntityManager {
  export type Map<D extends string, T extends Table | View> = DeepenAtDelimiter<
    D,
    Drizzle.IdentityMap<T>
  >;

  export type IntermediateType<
    D extends string,
    T extends Table | View,
  > = DeepFlat.Constraint.DeepFromFlat<Map<D, T>, Drizzle.InferSelect<T>>;
}

export const createCreateEntityManager = <D extends string>(delimiter: D) => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  const makeDrizzleMapper = <T extends Table>(
    table: T,
  ): Drizzle.Mapper<T, EntityManager.Map<D, T>> =>
    Drizzle.Mapper.make(table, deepenAtDelimiter);

  return function createEntityManager<A>() {
    return <
      T extends Table,
      M extends Codec.Map<A, B> = // @ts-expect-error
        [
          // no @ts-expect-error here
          A,
        ] extends [object]
          ? {}
          : never,
      B extends EntityManager.IntermediateType<D, T> = DeepFlat.DeepSimplify<
        EntityManager.Map<D, T>,
        EntityManager.IntermediateType<D, T> & Codec.Infer.Encoded<M, A>
      >,
    >(
      table: T,
      ...[map]: {} extends M ? [map?: M] : [map: M]
    ) =>
      new Mapik.Mapik<
        M,
        EntityManager.Map<D, T>,
        A,
        B,
        // @ts-expect-error
        Drizzle.InferSelect<// no @ts-expect-error here
        T>
      >(map ?? ({} as M), makeDrizzleMapper(table));
  };
};
