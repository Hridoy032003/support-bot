import { parseDayOffArg } from "@/lib/day";
import {
  getDayOffUntil,
  registerTelegramUser,
  setDayOff,
} from "@/lib/telegram-roster";
import { answerCallbackQuery, editMessageText, sendTelegramMessage } from "@/lib/telegram";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

const CANCEL_DAYOFF_BUTTON = {
  inline_keyboard: [[{ text: "❌ Cancel day off", callback_data: "dayon" }]],
};

const HELP = [
  "📋 <b>Commands</b>",
  "🌴 /dayoff — no alerts for today",
  "🌴 /dayoff tomorrow — no alerts tomorrow",
  "🌴 /dayoff 2026-11-10 — no alerts until that date (inclusive)",
  "✅ /dayon — cancel your day off, alerts back on",
  "ℹ️ /status — see whether alerts are on",
].join("\n");

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!TELEGRAM_WEBHOOK_SECRET || providedSecret !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Invalid secret", { status: 401 });
  }

  const update = await request.json().catch(() => null);

  const cb = update?.callback_query;
  if (cb) {
    const cbUsername: string | undefined = cb.from?.username;
    const cbChatId: number | undefined = cb.message?.chat?.id;
    if (cb.data === "dayon" && cbUsername && cbChatId) {
      await setDayOff(cbUsername, null);
      await answerCallbackQuery(cb.id, "Day off cancelled");
      await editMessageText(cbChatId, cb.message.message_id, "✅ Day off cancelled — alerts are back <b>ON</b> 🔔");
    } else {
      await answerCallbackQuery(cb.id);
    }
    return new Response("OK", { status: 200 });
  }

  const message = update?.message;
  const text: string = message?.text ?? "";
  const chatId: number | undefined = message?.chat?.id;
  const chatType: string | undefined = message?.chat?.type;
  const username: string | undefined = message?.from?.username;

  if (!text.startsWith("/") || !chatId) return new Response("OK", { status: 200 });

  const [rawCmd, ...rest] = text.trim().split(/\s+/);
  const command = rawCmd.split("@")[0].toLowerCase();
  const arg = rest.join(" ");

  if (chatType !== "private") {
    await sendTelegramMessage(
      chatId,
      "🙅‍♂️ Please DM me directly (not in this group 👥) and send /start there so I can register you for personal alerts."
    );
    return new Response("OK", { status: 200 });
  }

  if (!username) {
    await sendTelegramMessage(
      chatId,
      "🆔 You need a Telegram username set (Settings → Username) before I can DM you alerts. Set one, then send /start again 🔁"
    );
    return new Response("OK", { status: 200 });
  }

  // Any command from a DM registers/refreshes the user. Alerts are on by default.
  await registerTelegramUser(username, chatId);

  if (command === "/start") {
    await sendTelegramMessage(
      chatId,
      `✅ You're all set! 🎉 Alerts are <b>ON</b> — you'll get a DM here 📩 if an alert gets escalated to you.\n\n${HELP}`
    );
  } else if (command === "/dayoff") {
    const until = parseDayOffArg(arg);
    if (!until) {
      await sendTelegramMessage(
        chatId,
        "🤔 Couldn't read that date. Use /dayoff, /dayoff tomorrow, or /dayoff YYYY-MM-DD (today or later)."
      );
    } else {
      await setDayOff(username, until);
      await sendTelegramMessage(
        chatId,
        `🌴 Day off set — no alerts for you until the end of <b>${until}</b> (IST). Enjoy! 😎`,
        { replyMarkup: CANCEL_DAYOFF_BUTTON }
      );
    }
  } else if (command === "/dayon" || command === "/cancel") {
    await setDayOff(username, null);
    await sendTelegramMessage(chatId, "✅ Day off cancelled — alerts are back <b>ON</b> 🔔");
  } else if (command === "/status") {
    const until = await getDayOffUntil(username);
    await sendTelegramMessage(
      chatId,
      until
        ? `🌴 You're on a day off until the end of <b>${until}</b> (IST).`
        : "🔔 Alerts are <b>ON</b>.",
      until ? { replyMarkup: CANCEL_DAYOFF_BUTTON } : undefined
    );
  } else if (command === "/help") {
    await sendTelegramMessage(chatId, HELP);
  }

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return new Response("Telegram webhook endpoint is live", { status: 200 });
}
