import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { escalations } from "@/db/schema";
import { escapeHtml } from "@/lib/telegram";
import { sendDmToUsers } from "@/lib/telegram-roster";

export const ESCALATION_TRIO = ["rahul", "hridoy", "mohit"];
const ESCALATION_WINDOW_MS = 5 * 60 * 1000;

const CLICKUP_TO_TELEGRAM_USERNAME: Record<string, string> = {
  rahul: "harveySpec03",
  hridoy: "HridoySarkar03",
  mohit: "itz_mohit_king",
};

export async function addPendingEscalation(input: {
  channelId: string;
  messageId: string;
  text: string;
  link: string;
  mentioned: string[];
}): Promise<void> {
  try {
    await getDb()
      .insert(escalations)
      .values({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...input });
  } catch (err) {
    console.error("Failed to add pending escalation:", err);
  }
}

export async function markRepliedForChannel(channelId: string): Promise<void> {
  try {
    await getDb()
      .update(escalations)
      .set({ replied: true, repliedAt: new Date() })
      .where(
        and(
          eq(escalations.channelId, channelId),
          eq(escalations.replied, false),
          eq(escalations.escalated, false)
        )
      );
  } catch (err) {
    console.error("Failed to mark escalations replied:", err);
  }
}

export async function checkAndFireEscalations(): Promise<number> {
  const dueBefore = new Date(Date.now() - ESCALATION_WINDOW_MS);

  // Atomically claim due escalations so overlapping checks never double-send.
  const claimed = await getDb()
    .update(escalations)
    .set({ escalated: true, escalatedAt: new Date() })
    .where(
      and(
        eq(escalations.replied, false),
        eq(escalations.escalated, false),
        lte(escalations.mentionedAt, dueBefore)
      )
    )
    .returning();

  for (const item of claimed) {
    // DM only the people who were tagged; fall back to the whole trio if unknown.
    const names = item.mentioned.length > 0 ? item.mentioned : ESCALATION_TRIO;
    const telegramUsernames = names.map((name) => CLICKUP_TO_TELEGRAM_USERNAME[name] ?? name);
    const text = [
      "🚨⏰ <b>ESCALATION</b> — no reply in 5 min 😬",
      `💬 ${escapeHtml(item.text)}`,
      "👀 Needs someone's eyes on it, ASAP!",
      item.link ? `🔗 <a href="${item.link}">Open channel</a>` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await sendDmToUsers(telegramUsernames, text);
  }

  return claimed.length;
}
