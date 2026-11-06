import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";

export type AlertEvent = {
  id: string;
  source: "task-comment" | "chat-message";
  author: string;
  text: string;
  link: string;
  timestamp: string;
  delivered: boolean;
};

const MAX_EVENTS = 200;

export async function addEvent(event: Omit<AlertEvent, "id" | "timestamp">): Promise<void> {
  try {
    const db = getDb();
    await db.insert(events).values({
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    // keep only the newest MAX_EVENTS rows
    await db.execute(
      sql`DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY timestamp DESC LIMIT ${MAX_EVENTS})`
    );
  } catch (err) {
    console.error("Failed to persist event:", err);
  }
}

export async function getEvents(): Promise<AlertEvent[]> {
  try {
    const rows = await getDb().select().from(events).orderBy(desc(events.timestamp)).limit(MAX_EVENTS);
    return rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() }));
  } catch (err) {
    console.error("Failed to read events:", err);
    return [];
  }
}
