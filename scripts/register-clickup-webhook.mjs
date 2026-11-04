// Registers a ClickUp webhook that points at your deployed /api/clickup-webhook endpoint.
// Usage: node --env-file=.env.local scripts/register-clickup-webhook.mjs

const {
  CLICKUP_API_TOKEN,
  CLICKUP_TEAM_ID,
  CLICKUP_WEBHOOK_TARGET_URL,
  CLICKUP_TASK_ID,
  CLICKUP_LIST_ID,
  CLICKUP_SPACE_ID,
  CLICKUP_FOLDER_ID,
} = process.env;

if (!CLICKUP_API_TOKEN || !CLICKUP_TEAM_ID || !CLICKUP_WEBHOOK_TARGET_URL) {
  console.error(
    "Missing required env vars. Need CLICKUP_API_TOKEN, CLICKUP_TEAM_ID, CLICKUP_WEBHOOK_TARGET_URL."
  );
  process.exit(1);
}

const body = {
  endpoint: CLICKUP_WEBHOOK_TARGET_URL,
  events: ["taskCommentPosted", "taskCommentUpdated"],
};
if (CLICKUP_TASK_ID) body.task_id = CLICKUP_TASK_ID;
if (CLICKUP_LIST_ID) body.list_id = CLICKUP_LIST_ID;
if (CLICKUP_SPACE_ID) body.space_id = CLICKUP_SPACE_ID;
if (CLICKUP_FOLDER_ID) body.folder_id = CLICKUP_FOLDER_ID;

const res = await fetch(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}/webhook`, {
  method: "POST",
  headers: {
    Authorization: CLICKUP_API_TOKEN,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const data = await res.json();

if (!res.ok) {
  console.error("Failed to create webhook:", res.status, data);
  process.exit(1);
}

console.log("Webhook created successfully.");
console.log("webhook_id:", data.webhook?.id);
console.log("secret:", data.webhook?.secret);
console.log("\n>>> Copy the secret above into CLICKUP_WEBHOOK_SECRET in .env.local <<<");
