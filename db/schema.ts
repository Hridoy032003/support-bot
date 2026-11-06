import { sql } from "drizzle-orm";
import { bigint, boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    source: text("source").$type<"task-comment" | "chat-message">().notNull(),
    author: text("author").notNull(),
    text: text("text").notNull(),
    link: text("link").notNull().default(""),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    delivered: boolean("delivered").notNull().default(false),
  },
  (t) => [index("events_timestamp_idx").on(t.timestamp)]
);

export const escalations = pgTable(
  "escalations",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id").notNull(),
    text: text("text").notNull(),
    link: text("link").notNull().default(""),
    // escalation-trio names (rahul/hridoy/mohit) that were tagged in the message
    mentioned: text("mentioned").array().notNull().default(sql`'{}'::text[]`),
    mentionedAt: timestamp("mentioned_at", { withTimezone: true }).notNull().defaultNow(),
    replied: boolean("replied").notNull().default(false),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    escalated: boolean("escalated").notNull().default(false),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  },
  (t) => [index("escalations_pending_idx").on(t.replied, t.escalated, t.mentionedAt)]
);

export const roster = pgTable("telegram_roster", {
  // lower-cased Telegram username
  username: text("username").primaryKey(),
  displayUsername: text("display_username").notNull(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});
