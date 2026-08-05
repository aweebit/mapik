import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { bigint, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: varchar().notNull().unique(),
  big: bigint({ mode: "bigint" }),
});

const db = drizzle("TBD");

const user = await db
  .select({ name: users.name })
  .from(users)
  .where(eq(users.id, 1));
