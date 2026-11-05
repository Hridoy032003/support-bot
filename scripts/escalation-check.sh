#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/autobot"

set -a
source "$APP_DIR/.env.local"
set +a

curl -s -o /dev/null -w "escalation-check: %{http_code}\n" \
  -X POST "http://localhost:3000/api/escalation-check" \
  -H "x-escalation-secret: ${ESCALATION_CHECK_SECRET}"
