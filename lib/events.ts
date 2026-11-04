import fs from "fs";
import path from "path";

export type AlertEvent = {
  id: string;
  source: "task-comment" | "chat-message";
  author: string;
  text: string;
  link: string;
  timestamp: string;
  delivered: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");
const MAX_EVENTS = 200;

function readAll(): AlertEvent[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addEvent(event: Omit<AlertEvent, "id" | "timestamp">): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const events = readAll();
    events.unshift({
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(events.slice(0, MAX_EVENTS), null, 2));
  } catch (err) {
    console.error("Failed to persist event:", err);
  }
}

export function getEvents(): AlertEvent[] {
  return readAll();
}
