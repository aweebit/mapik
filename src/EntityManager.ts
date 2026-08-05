import type { InferSelectModel, Table } from "drizzle-orm";
import * as Codec from "./Codec.js";
import type * as DeepFlat from "./DeepFlat.js";
import * as Drizzle from "./Drizzle.js";
import { createDeepenAtDelimiter, type DeepenAtDelimiter } from "./Utils.js";

export class EntityManager<
  D extends string,
  A,
  T extends Table,
  const M extends Codec.Map<A, B>,
  B extends DeepFlat.Constraint.Deep<
    DeepenAtDelimiter<"_", Drizzle.MapToSelf<T>>,
    InferSelectModel<T>
  > = Codec.Infer.Encoded<M, A> extends infer B extends
    DeepFlat.Constraint.Deep<
      DeepenAtDelimiter<"_", Drizzle.MapToSelf<T>>,
      InferSelectModel<T>
    >
    ? B
    : never,
> {
  readonly effectMapper: Codec.Mapper<M, A, B>;

  constructor(
    readonly drizzleMapper: Drizzle.TableMapper<
      T,
      DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>
    >,
    readonly map: M,
  ) {
    this.effectMapper = new Codec.Mapper(map);
  }

  encode<X extends Codec.Constraint.Type<M, A, B>>(
    input: X,
  ): DeepFlat.Flatten<
    DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>,
    // @ts-expect-error
    Codec.Encode<M, X, A, B>
  > {
    return this.drizzleMapper.flatten(this.effectMapper.encode(input) as any);
  }

  decode<
    X extends DeepFlat.Constraint.Flat<
      DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>,
      InferSelectModel<T>
    >,
  >(
    input: X,
  ): Codec.Decode<
    M,
    // @ts-expect-error
    DeepFlat.Deepen<DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>, X>,
    A,
    B
  > {
    return this.effectMapper.decode(this.drizzleMapper.deepen(input) as any);
  }
}

export const createCreateEntityManager = <D extends string>(delimiter: D) => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  const makeDrizzleMapper = <T extends Table>(
    table: T,
  ): Drizzle.TableMapper<T, DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>> =>
    Drizzle.TableMapper.make(table, deepenAtDelimiter);

  return function createEntityManager<A>() {
    return <
      T extends Table,
      const M extends Codec.Map<A, B>,
      B extends DeepFlat.Constraint.Deep<
        DeepenAtDelimiter<"_", Drizzle.MapToSelf<T>>,
        InferSelectModel<T>
      > = Codec.Infer.Encoded<M, A> extends infer B extends
        DeepFlat.Constraint.Deep<
          DeepenAtDelimiter<"_", Drizzle.MapToSelf<T>>,
          InferSelectModel<T>
        >
        ? B
        : never,
    >(
      table: T,
      map: M,
    ) => new EntityManager<D, A, T, M, B>(makeDrizzleMapper(table), map);
  };
};
