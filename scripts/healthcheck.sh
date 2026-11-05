#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/autobot"
HEALTH_URL="http://localhost:3000/api/health"
STATE_FILE="$APP_DIR/data/health-state"
TIMEOUT=5

set -a
source "$APP_DIR/.env.local"
set +a

mkdir -p "$APP_DIR/data"
[ -f "$STATE_FILE" ] || echo "up" > "$STATE_FILE"
PREV_STATE=$(cat "$STATE_FILE")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$HEALTH_URL" || echo "000")

send_telegram() {
  local text="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(printf '{"chat_id":"%s","text":"%s","parse_mode":"HTML"}' "$TELEGRAM_CHAT_ID" "$text")" \
    > /dev/null
}

if [ "$HTTP_CODE" = "200" ]; then
  if [ "$PREV_STATE" = "down" ]; then
    send_telegram "🟢🎉 <b>autobot is back UP</b>%0AHealth check responded 200 again. Phew! 😅"
    echo "up" > "$STATE_FILE"
  fi
else
  if [ "$PREV_STATE" = "up" ]; then
    send_telegram "🔴💀 <b>autobot is DOWN</b>%0AHealth check at ${HEALTH_URL} returned HTTP ${HTTP_CODE}. 🆘"
    echo "down" > "$STATE_FILE"
  fi
fi
