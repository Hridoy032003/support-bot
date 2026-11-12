import { desc, eq, sql } from "drizzle-orm";
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

export function newEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Link to the in-app popup for an event, or "" when APP_BASE_URL isn't configured. */
export function eventViewUrl(id: string): string {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/m/${id}` : "";
}

export async function addEvent(
  event: Omit<AlertEvent, "id" | "timestamp"> & { id?: string }
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(events).values({
      ...event,
      id: event.id ?? newEventId(),
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

export async function getEventById(id: string): Promise<AlertEvent | null> {
  try {
    const rows = await getDb().select().from(events).where(eq(events.id, id)).limit(1);
    return rows[0] ? { ...rows[0], timestamp: rows[0].timestamp.toISOString() } : null;
  } catch (err) {
    console.error("Failed to read event:", err);
    return null;
  }
}
