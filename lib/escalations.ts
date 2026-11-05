import fs from "fs";
import path from "path";
import { escapeHtml } from "@/lib/telegram";
import { sendDmToUsers } from "@/lib/telegram-roster";

export const ESCALATION_TRIO = ["rahul", "hridoy", "mohit"];
const ESCALATION_WINDOW_MS = 5 * 60 * 1000;

const CLICKUP_TO_TELEGRAM_USERNAME: Record<string, string> = {
  rahul: "harveySpec03",
  hridoy: "HridoySarkar03",
  mohit: "itz_mohit_king",
};

type Escalation = {
  id: string;
  channelId: string;
  messageId: string;
  text: string;
  link: string;
  mentionedAt: string;
  replied: boolean;
  repliedAt?: string;
  escalated: boolean;
  escalatedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "escalations.json");

function readAll(): Escalation[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeAll(items: Escalation[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

export function addPendingEscalation(input: {
  channelId: string;
  messageId: string;
  text: string;
  link: string;
}): void {
  const items = readAll();
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
    mentionedAt: new Date().toISOString(),
    replied: false,
    escalated: false,
  });
  writeAll(items.slice(-500));
}

export function markRepliedForChannel(channelId: string): void {
  const items = readAll();
  let changed = false;
  for (const item of items) {
    if (item.channelId === channelId && !item.replied && !item.escalated) {
      item.replied = true;
      item.repliedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeAll(items);
}

export async function checkAndFireEscalations(): Promise<number> {
  const items = readAll();
  const now = Date.now();
  let fired = 0;

  for (const item of items) {
    if (item.replied || item.escalated) continue;
    const dueAt = new Date(item.mentionedAt).getTime() + ESCALATION_WINDOW_MS;
    if (now < dueAt) continue;

    const text = [
      "🚨⏰ <b>ESCALATION</b> — no reply in 5 min 😬",
      `💬 ${escapeHtml(item.text)}`,
      "👀 Needs someone's eyes on it, ASAP!",
      item.link ? `🔗 <a href="${item.link}">Open channel</a>` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const telegramUsernames = ESCALATION_TRIO.map(
      (name) => CLICKUP_TO_TELEGRAM_USERNAME[name] ?? name
    );
    await sendDmToUsers(telegramUsernames, text);
    item.escalated = true;
    item.escalatedAt = new Date().toISOString();
    fired++;
  }

  if (fired > 0) writeAll(items);
  return fired;
}
