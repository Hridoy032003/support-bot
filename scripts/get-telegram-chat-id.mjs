// Finds your Telegram group chat ID (needed for TELEGRAM_CHAT_ID).
// Add the bot to your group first, send any message in the group, then run this.
// Usage: node --env-file=.env.local scripts/get-telegram-chat-id.mjs

const { TELEGRAM_BOT_TOKEN } = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
console.log(
  '\nLook for "chat": { "id": ... } on a message from your group. ' +
    "Group chat IDs are negative numbers (e.g. -1001234567890). That is TELEGRAM_CHAT_ID."
);
