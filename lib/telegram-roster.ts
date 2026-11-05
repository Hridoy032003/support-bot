import fs from "fs";
import path from "path";
import { sendTelegramMessage } from "@/lib/telegram";

type RosterEntry = { chatId: number; username: string; registeredAt: string };

const DATA_DIR = path.join(process.cwd(), "data");
const ROSTER_FILE = path.join(DATA_DIR, "telegram-roster.json");

function readRoster(): Record<string, RosterEntry> {
  try {
    return JSON.parse(fs.readFileSync(ROSTER_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeRoster(roster: Record<string, RosterEntry>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ROSTER_FILE, JSON.stringify(roster, null, 2));
}

export function registerTelegramUser(username: string, chatId: number): void {
  const roster = readRoster();
  roster[username.toLowerCase()] = {
    chatId,
    username,
    registeredAt: new Date().toISOString(),
  };
  writeRoster(roster);
}

export function getChatId(username: string): number | undefined {
  return readRoster()[username.toLowerCase()]?.chatId;
}

export function getAllRegistered(): RosterEntry[] {
  return Object.values(readRoster());
}

export async function sendDmToUsers(
  usernames: string[],
  text: string
): Promise<Array<{ username: string; delivered: boolean }>> {
  const results: Array<{ username: string; delivered: boolean }> = [];
  for (const username of usernames) {
    const chatId = getChatId(username);
    const delivered = chatId ? await sendTelegramMessage(chatId, text) : false;
    results.push({ username, delivered });
  }
  return results;
}
