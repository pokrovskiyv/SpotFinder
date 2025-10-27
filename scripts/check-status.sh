#!/bin/bash

# Script to check bot and webhook status

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

echo "=== Bot Information ==="
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" | jq '.'

echo ""
echo "=== Webhook Status ==="
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq '.'

echo ""
echo "=== Bot Commands ==="
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMyCommands" | jq '.'

