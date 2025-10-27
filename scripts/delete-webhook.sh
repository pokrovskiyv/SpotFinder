#!/bin/bash

# Script to delete Telegram webhook (useful for local development)

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

echo "Deleting webhook..."

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"

echo ""
echo ""
echo "Webhook deleted! Bot will now use long polling (useful for local testing)"
echo "To set webhook again, use: ./scripts/setup-webhook.sh"

