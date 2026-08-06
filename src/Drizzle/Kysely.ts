import type { InferInsertModel, InferSelectModel, Table } from "drizzle-orm";
import { toCamelCase, toSnakeCase } from "drizzle-orm/casing";
import { CamelCasePlugin, type ColumnType } from "kysely";

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

export type UnsafeKyselify<Ts extends readonly Table[]> = {
  [K in keyof Ts & `${number}` as UnsafeKyselifyTableName<
    Ts[K]
  >]: UnsafeKyselifyTable<Ts[K]>;
};

export type UnsafeKyselifyTableCamelCase<T extends Table> =
  UnsafeKyselifyTable<T> extends infer U
    ? { [K in keyof U & string as ToCamelCase<K>]: U[K] }
    : never;

export type UnsafeKyselifyTableNameCamelCase<T extends Table> =
  T["_"]["schema"] extends infer SchemaName
    ? SchemaName extends string
      ? `${ToCamelCase<SchemaName>}.${ToCamelCase<T["_"]["name"]>}`
      : ToCamelCase<T["_"]["name"]>
    : never;

export type UnsafeKyselifyCamelCase<Ts extends readonly Table[]> = {
  [K in keyof Ts & `${number}` as UnsafeKyselifyTableNameCamelCase<
    Ts[K]
  >]: UnsafeKyselifyTableCamelCase<Ts[K]>;
};

export type ToCamelCase<
  S extends string,
  ShouldCapitalize extends boolean = false,
> = S extends `'${infer R}`
  ? ToCamelCase<R, ShouldCapitalize>
  : S extends `${infer A}${infer R}`
    ? A extends `${bigint}`
      ? `${A}${ToCamelCase<R>}`
      : Capitalize<A> extends Uncapitalize<A> // not a letter
        ? ToCamelCase<R, true>
        : `${ShouldCapitalize extends true
            ? Capitalize<A>
            : ShouldCapitalize extends false
              ? A
              : never}${ToCamelCase<R>}`
    : S;

export class UnsafeCamelCasePlugin extends CamelCasePlugin {
  constructor() {
    super({ maintainNestedObjectKeys: true });
  }

  protected override snakeCase(str: string): string {
    return toSnakeCase(str);
  }

  protected override camelCase(str: string): string {
    return toCamelCase(str);
  }
}
