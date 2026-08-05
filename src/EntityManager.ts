import type { InferSelectModel, Table } from "drizzle-orm";
import * as Codec from "./Codec.js";
import {
  createDeepenAtDelimiter,
  type DeepenAtDelimiter,
} from "./deepenAtDelimiter.js";
import type * as DeepFlat from "./DeepFlat.js";
import * as Drizzle from "./Drizzle.js";

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

export interface EntityManagerClass<D extends string> {
  new <
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
  >(
    drizzleMapper: Drizzle.TableMapper<
      T,
      DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>
    >,
    map: M,
  ): EntityManager<D, A, T, M, B>;

  make<A>(): <
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
  ) => EntityManager<D, A, T, M, B>;
}

export const createEntityManagerClass = <D extends string>(
  delimiter: D,
): EntityManagerClass<D> => {
  const deepenAtDelimiter = createDeepenAtDelimiter(delimiter);

  const makeDrizzleMapper = <T extends Table>(
    table: T,
  ): Drizzle.TableMapper<T, DeepenAtDelimiter<D, Drizzle.MapToSelf<T>>> =>
    Drizzle.TableMapper.make(table, deepenAtDelimiter);

  const _EntityManager = EntityManager;

  return class EntityManager<
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
  > extends _EntityManager<D, A, T, M, B> {
    static make<A>() {
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
      ) => new EntityManager<A, T, M, B>(makeDrizzleMapper(table), map);
    }
  } as EntityManagerClass<D>;
};
