import { escapeHtml, sendTelegramAlert } from "@/lib/telegram";
import { addEvent } from "@/lib/events";

const CHAT_WEBHOOK_SECRET = process.env.CLICKUP_CHAT_WEBHOOK_SECRET ?? "";
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN ?? "";
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID ?? "";

type ClickUpMember = { user?: { id?: number; username?: string } };

async function resolveUsername(userId: string | number | undefined): Promise<string> {
  if (!userId || !CLICKUP_API_TOKEN || !CLICKUP_TEAM_ID) return "Someone";
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}`, {
      headers: { Authorization: CLICKUP_API_TOKEN },
    });
    if (!res.ok) return "Someone";
    const data = await res.json();
    const members: ClickUpMember[] = data?.team?.members ?? [];
    const match = members.find((m) => String(m.user?.id) === String(userId));
    return match?.user?.username ?? "Someone";
  } catch {
    return "Someone";
  }
}

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-webhook-secret");
  if (!CHAT_WEBHOOK_SECRET || providedSecret !== CHAT_WEBHOOK_SECRET) {
    return new Response("Invalid secret", { status: 401 });
  }

  const rawBody = await request.text();
  console.log("ClickUp chat webhook received:", rawBody.slice(0, 3000));

  let parsed: any;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("OK", { status: 200 });
  }

  const data = parsed?.payload?.data;
  if (!data || !data.id) {
    // Generic "Test webhook" ping from ClickUp's UI - nothing to alert on.
    console.log("No chat message data in payload (likely a connectivity test)");
    return new Response("OK", { status: 200 });
  }

  const channelId: string = data.parent ?? "";
  const text: string = data.text_content || "(no text found)";
  const username = await resolveUsername(data.userid);
  const channelLink = channelId
    ? `https://app.clickup.com/${CLICKUP_TEAM_ID}/chat/r/${channelId}`
    : "";

  const message = [
    "🔔 <b>New ClickUp Chat message</b>",
    `👤 ${escapeHtml(username)}`,
    `💬 ${escapeHtml(text)}`,
    channelLink ? `🔗 <a href="${channelLink}">Open channel</a>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const delivered = await sendTelegramAlert(message);
  addEvent({
    source: "chat-message",
    author: username,
    text,
    link: channelLink,
    delivered,
  });

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return new Response("ClickUp chat webhook endpoint is live", { status: 200 });
}
