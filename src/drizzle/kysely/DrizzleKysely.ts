import type { InferInsertModel, InferSelectModel, Table } from "drizzle-orm";
import type { ColumnType } from "kysely";

export type UnsafeKyselifyTable<T extends Table> = T extends unknown
  ? {
      [Key in keyof T["_"]["columns"] & string]: ColumnType<
        // select
        InferSelectModel<T>[Key],
        // insert
        Key extends keyof InferInsertModel<T>
          ? InferInsertModel<T>[Key]
          : never,
        // update
        Key extends keyof InferInsertModel<T> ? InferInsertModel<T>[Key] : never
      >;
    }
  : never;

export type UnsafeKyselifyTableName<T extends Table> =
  T["_"]["schema"] extends infer SchemaName
    ? SchemaName extends string
      ? `${SchemaName}.${T["_"]["name"]}`
      : T["_"]["name"]
    : never;

export type UnsafeKyselifyTables<Ts extends readonly Table[]> = {
  [K in keyof Ts & `${number}` as UnsafeKyselifyTableName<
    Ts[K]
  >]: UnsafeKyselifyTable<Ts[K]>;
};
