import type { Table, View } from "drizzle-orm";
import { Codec, type DeepFlat } from "../index.js";
import { createDeepenAtDelimiter, type DeepenAtDelimiter } from "../Utils.js";
import type { IsAny } from "../utils/index.js";
import { Drizzle } from "./index.js";

export namespace EntityManager {
  export type DrizzleMap<D extends string, T extends Table | View> =
    | Table
    | View extends T
    ? DeepFlat.Map<string>
    : DeepenAtDelimiter<D, Drizzle.IdentityMap<T>>;

  export type IntermediateType<
    D extends string,
    T extends Table | View,
  > = DeepFlat.Constraint.Deep<DrizzleMap<D, T>, Drizzle.InferSelect<T>>;
}

export class EntityManager<
  D extends string,
  A = any,
  T extends Table | View = Table | View,
  const M extends Codec.Map<A, B> = any,
  B extends EntityManager.IntermediateType<D, T> = IsAny<M> extends true
    ? any
    : Codec.Infer.Encoded<M, A> extends infer B extends
          EntityManager.IntermediateType<D, T>
      ? B
      : never,
> {
  readonly codecMapper: Codec.Mapper<M, A, B>;

  constructor(
    readonly delimiter: D,
    readonly drizzleMapper: Drizzle.Mapper<T, EntityManager.DrizzleMap<D, T>>,
    readonly map: M,
  ) {
    this.codecMapper = new Codec.Mapper(map);
  }

  encode<X extends Codec.Constraint.Type<M, A, B>>(
    input: X,
  ): DeepFlat.Flatten<
    DeepenAtDelimiter<D, Drizzle.IdentityMap<T>>,
    // @ts-expect-error
    Codec.Encode<
      // no @ts-expect-error here
      M,
      X,
      A,
      B
    >
  > {
    return this.drizzleMapper.flatten(this.codecMapper.encode(input) as any);
  }

  decode<
    X extends DeepFlat.Constraint.Flat<
      EntityManager.DrizzleMap<D, T>,
      EntityManager.IntermediateType<D, T>
    >,
  >(
    input: DeepFlat.Deepen<
      EntityManager.DrizzleMap<D, T>,
      X
    > extends Codec.Constraint.Encoded<M, A, B>
      ? X
      : never,
  ): DeepFlat.Deepen<EntityManager.DrizzleMap<D, T>, X> extends infer U extends
    Codec.Constraint.Encoded<M, A, B>
    ? Codec.Decode<M, DeepFlat.Deepen<EntityManager.DrizzleMap<D, T>, X>, A, B>
    : never {
    return this.codecMapper.decode(
      this.drizzleMapper.deepen(input) as any,
    ) as any;
  }
}

export const createCreateEntityManager = <D extends string>(delimiter: D) => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  const makeDrizzleMapper = <T extends Table>(
    table: T,
  ): Drizzle.Mapper<T, DeepenAtDelimiter<D, Drizzle.IdentityMap<T>>> =>
    Drizzle.Mapper.make(table, deepenAtDelimiter);

  return function createEntityManager<A>() {
    return <
      T extends Table,
      const M extends Codec.Map<A, B> = // @ts-expect-error
        [
          // no @ts-expect-error here
          A,
        ] extends [object]
          ? (() => never) extends A
            ? never
            : {}
          : never,
      B extends EntityManager.IntermediateType<D, T> = Codec.Infer.Encoded<
        M,
        A
      > extends infer B extends EntityManager.IntermediateType<D, T>
        ? B
        : never,
    >(
      table: T,
      ...[map]: {} extends M ? [map?: M] : [map: M]
    ) =>
      new EntityManager<D, A, T, M, B>(
        delimiter,
        makeDrizzleMapper(table),
        (map ?? {}) as M,
      );
  };
};
