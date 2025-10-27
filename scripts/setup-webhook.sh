#!/bin/bash

# Script to set up Telegram webhook

# Check required environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$WEBHOOK_URL" ]; then
    echo "Error: WEBHOOK_URL environment variable is not set"
    echo "Example: WEBHOOK_URL=https://your-project.functions.supabase.co/telegram-webhook"
    echo "IMPORTANT: Use .functions.supabase.co (public, no auth), NOT .supabase.co/functions/v1/ (requires auth)"
    exit 1
fi

echo "Setting webhook to: $WEBHOOK_URL"

# Set webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"

echo ""
echo ""
echo "Checking webhook status..."
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

echo ""
echo ""
echo "Done! Your bot should now be receiving updates at: $WEBHOOK_URL"

