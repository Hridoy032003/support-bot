// Finds your ClickUp Team ID (needed to register a webhook).
// Usage: node --env-file=.env.local scripts/list-clickup-teams.mjs

const { CLICKUP_API_TOKEN } = process.env;

if (!CLICKUP_API_TOKEN) {
  console.error("Missing CLICKUP_API_TOKEN.");
  process.exit(1);
}

const res = await fetch("https://api.clickup.com/api/v2/team", {
  headers: { Authorization: CLICKUP_API_TOKEN },
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
