import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { roster } from "@/db/schema";
import { istDate } from "@/lib/day";
import { sendTelegramMessage } from "@/lib/telegram";

type RosterRow = typeof roster.$inferSelect;

export async function registerTelegramUser(username: string, chatId: number): Promise<void> {
  await getDb()
    .insert(roster)
    .values({ username: username.toLowerCase(), displayUsername: username, chatId })
    .onConflictDoUpdate({
      target: roster.username,
      // keep dayOffUntil untouched so re-sending /start doesn't cancel a day off
      set: { displayUsername: username, chatId, registeredAt: sql`now()` },
    });
}

async function getRow(username: string): Promise<RosterRow | undefined> {
  const rows = await getDb()
    .select()
    .from(roster)
    .where(sql`${roster.username} = ${username.toLowerCase()}`)
    .limit(1);
  return rows[0];
}

export async function getChatId(username: string): Promise<number | undefined> {
  return (await getRow(username))?.chatId;
}

export async function getAllRegistered() {
  return getDb().select().from(roster);
}

export function isOnDayOff(row: Pick<RosterRow, "dayOffUntil"> | undefined): boolean {
  return !!row?.dayOffUntil && istDate(0) <= row.dayOffUntil;
}

/** Sets the last day off (YYYY-MM-DD IST), or clears it with null. */
export async function setDayOff(username: string, until: string | null): Promise<void> {
  await getDb()
    .update(roster)
    .set({ dayOffUntil: until })
    .where(sql`${roster.username} = ${username.toLowerCase()}`);
}

export async function getDayOffUntil(username: string): Promise<string | null> {
  const row = await getRow(username);
  return isOnDayOff(row) ? (row?.dayOffUntil ?? null) : null;
}

export async function sendDmToUsers(
  usernames: string[],
  text: string
): Promise<Array<{ username: string; delivered: boolean; skipped?: "day-off" | "not-registered" }>> {
  const results: Array<{ username: string; delivered: boolean; skipped?: "day-off" | "not-registered" }> = [];
  for (const username of usernames) {
    const row = await getRow(username);
    if (!row) {
      results.push({ username, delivered: false, skipped: "not-registered" });
    } else if (isOnDayOff(row)) {
      results.push({ username, delivered: false, skipped: "day-off" });
    } else {
      results.push({ username, delivered: await sendTelegramMessage(row.chatId, text) });
    }
  }
  return results;
}
