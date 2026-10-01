import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ballots = sqliteTable("ballots", {
  voterId: text("voter_id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const votes = sqliteTable("votes", {
  voterId: text("voter_id").notNull().references(() => ballots.voterId),
  person: text("person").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
}, table => [primaryKey({ columns: [table.voterId, table.person] })]);
