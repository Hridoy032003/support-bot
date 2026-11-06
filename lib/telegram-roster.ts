import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { roster } from "@/db/schema";
import { sendTelegramMessage } from "@/lib/telegram";

export async function registerTelegramUser(username: string, chatId: number): Promise<void> {
  await getDb()
    .insert(roster)
    .values({ username: username.toLowerCase(), displayUsername: username, chatId })
    .onConflictDoUpdate({
      target: roster.username,
      set: { displayUsername: username, chatId, registeredAt: sql`now()` },
    });
}

export async function getChatId(username: string): Promise<number | undefined> {
  const rows = await getDb()
    .select({ chatId: roster.chatId })
    .from(roster)
    .where(sql`${roster.username} = ${username.toLowerCase()}`)
    .limit(1);
  return rows[0]?.chatId;
}

export async function getAllRegistered() {
  return getDb().select().from(roster);
}

export async function sendDmToUsers(
  usernames: string[],
  text: string
): Promise<Array<{ username: string; delivered: boolean }>> {
  const results: Array<{ username: string; delivered: boolean }> = [];
  for (const username of usernames) {
    const chatId = await getChatId(username);
    const delivered = chatId ? await sendTelegramMessage(chatId, text) : false;
    results.push({ username, delivered });
  }
  return results;
}
