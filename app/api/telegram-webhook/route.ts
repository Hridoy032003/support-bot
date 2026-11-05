import { registerTelegramUser } from "@/lib/telegram-roster";
import { sendTelegramMessage } from "@/lib/telegram";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!TELEGRAM_WEBHOOK_SECRET || providedSecret !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Invalid secret", { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const text: string = message?.text ?? "";
  const chatId: number | undefined = message?.chat?.id;
  const chatType: string | undefined = message?.chat?.type;
  const username: string | undefined = message?.from?.username;

  if (text.startsWith("/start") && chatId) {
    if (chatType !== "private") {
      await sendTelegramMessage(
        chatId,
        "⚠️ Please DM me directly (not in this group) and send /start there so I can register you for personal alerts."
      );
    } else if (username) {
      registerTelegramUser(username, chatId);
      await sendTelegramMessage(
        chatId,
        "✅ You're registered. You'll get a DM here if an alert gets escalated to you."
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "⚠️ You need a Telegram username set (Settings → Username) before I can DM you alerts. Set one, then send /start again."
      );
    }
  }

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return new Response("Telegram webhook endpoint is live", { status: 200 });
}
