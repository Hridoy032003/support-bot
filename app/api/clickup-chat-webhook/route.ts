import { escapeHtml, sendTelegramAlert } from "@/lib/telegram";
import { addEvent } from "@/lib/events";
import { ESCALATION_TRIO, addPendingEscalation, markRepliedForChannel } from "@/lib/escalations";

const CHAT_WEBHOOK_SECRET = process.env.CLICKUP_CHAT_WEBHOOK_SECRET ?? "";
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN ?? "";
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID ?? "";
const MUTED_SOLO_MENTION_USERNAME = "pratham";
const AUTHOR_TOPIC_ROUTES: Array<{ match: string; threadId: string }> = [
  { match: "mike", threadId: process.env.TELEGRAM_MIKE_THREAD_ID ?? "" },
];

function resolveTopicThreadId(authorUsername: string): string | undefined {
  const route = AUTHOR_TOPIC_ROUTES.find(
    (r) => r.threadId && authorUsername.toLowerCase().includes(r.match)
  );
  return route?.threadId;
}

function isMikeAuthor(authorUsername: string): boolean {
  return authorUsername.toLowerCase().includes("mike");
}

type ClickUpMember = { user?: { id?: number; username?: string } };

function extractMentionedUsernames(comment: unknown): string[] {
  if (!Array.isArray(comment)) return [];
  return comment
    .filter((item: any) => item?.type === "tag" || item?.type === "user_mention")
    .map((item: any) => item?.user?.username ?? item?.user_mention?.name ?? "")
    .filter(Boolean);
}

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

  const mentionedUsernames = extractMentionedUsernames(data.comment);
  const matchesEscalationTrio = (name: string): boolean => {
    const lower = name.toLowerCase();
    return ESCALATION_TRIO.some((trioName) => lower.includes(trioName));
  };

  if (matchesEscalationTrio(username)) {
    markRepliedForChannel(channelId);
  }
  if (mentionedUsernames.some(matchesEscalationTrio)) {
    addPendingEscalation({ channelId, messageId: String(data.id), text, link: channelLink });
  }

  const onlyMentionsMutedUser =
    mentionedUsernames.length > 0 &&
    mentionedUsernames.every((name) => name.toLowerCase() === MUTED_SOLO_MENTION_USERNAME);

  if (onlyMentionsMutedUser) {
    console.log(`Skipping Telegram alert: message only mentions @${MUTED_SOLO_MENTION_USERNAME}`);
    addEvent({
      source: "chat-message",
      author: username,
      text,
      link: channelLink,
      delivered: false,
    });
    return new Response("OK", { status: 200 });
  }

  const message = (
    isMikeAuthor(username)
      ? [
          "🚨 <b>CLICKUP ALERT</b> 🚨",
          "━━━━━━━━━━━━━━━",
          `👤 <b>From:</b> ${escapeHtml(username)}`,
          `💬 <b>Message:</b> ${escapeHtml(text)}`,
          "━━━━━━━━━━━━━━━",
          channelLink ? `🔗 <a href="${channelLink}">Open channel</a>` : "",
        ]
      : [
          "🔔 <b>New ClickUp Chat message</b>",
          `👤 ${escapeHtml(username)}`,
          `💬 ${escapeHtml(text)}`,
          channelLink ? `🔗 <a href="${channelLink}">Open channel</a>` : "",
        ]
  )
    .filter(Boolean)
    .join("\n");

  const threadId = resolveTopicThreadId(username);
  const delivered = await sendTelegramAlert(message, { threadId });
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
