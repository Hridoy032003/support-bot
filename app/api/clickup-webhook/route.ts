import crypto from "crypto";
import { escapeHtml, sendTelegramAlert } from "@/lib/telegram";
import { addEvent } from "@/lib/events";

const CLICKUP_WEBHOOK_SECRET = process.env.CLICKUP_WEBHOOK_SECRET ?? "";

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!CLICKUP_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", CLICKUP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function extractCommentText(historyItems: unknown): string {
  if (!Array.isArray(historyItems)) return "";
  return historyItems
    .map((item: any) => {
      if (Array.isArray(item?.comment)) {
        return item.comment.map((c: any) => c?.text ?? "").join("");
      }
      return item?.comment_text ?? "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { event, task_id, history_items } = payload ?? {};

  if (event === "taskCommentPosted" || event === "taskCommentUpdated") {
    const commentText = extractCommentText(history_items) || "(no text found)";
    const username = history_items?.[0]?.user?.username ?? "Someone";
    const taskLink = task_id ? `https://app.clickup.com/t/${task_id}` : "";

    const message = [
      "🔔 <b>New ClickUp comment</b>",
      `👤 ${escapeHtml(username)}`,
      `💬 ${escapeHtml(commentText)}`,
      taskLink ? `🔗 <a href="${taskLink}">Open task</a>` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const delivered = await sendTelegramAlert(message);
    addEvent({
      source: "task-comment",
      author: username,
      text: commentText,
      link: taskLink,
      delivered,
    });
  } else {
    console.log("Unhandled ClickUp event:", event);
  }

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return new Response("ClickUp webhook endpoint is live", { status: 200 });
}
