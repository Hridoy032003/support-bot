const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

export function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { threadId?: string; replyMarkup?: object }
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Telegram not configured: missing TELEGRAM_BOT_TOKEN");
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(options?.threadId ? { message_thread_id: Number(options.threadId) } : {}),
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.status, await res.text());
    return false;
  }
  return true;
}

export async function sendTelegramAlert(
  text: string,
  options?: { threadId?: string }
): Promise<boolean> {
  if (!TELEGRAM_CHAT_ID) {
    console.error("Telegram not configured: missing TELEGRAM_CHAT_ID");
    return false;
  }
  return sendTelegramMessage(TELEGRAM_CHAT_ID, text, options);
}

async function telegramApi(method: string, body: object): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`Telegram ${method} failed:`, res.status, await res.text());
}

export function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  return telegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

/** Replaces a message's text and removes its inline keyboard. */
export function editMessageText(chatId: string | number, messageId: number, text: string): Promise<void> {
  return telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  });
}
