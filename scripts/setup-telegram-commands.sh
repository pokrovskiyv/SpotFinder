#!/bin/bash

# Script to set up Telegram bot commands

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN environment variable is not set"
    echo "Usage: TELEGRAM_BOT_TOKEN=your_token ./scripts/setup-telegram-commands.sh"
    exit 1
fi

echo "Setting up Telegram bot commands..."

# Define bot commands
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {
        "command": "start",
        "description": "Начать работу с ботом"
      },
      {
        "command": "help",
        "description": "Справка по использованию"
      },
      {
        "command": "location",
        "description": "Обновить геолокацию"
      },
      {
        "command": "donate",
        "description": "Поддержать бота"
      }
    ]
  }'

echo ""
echo "Commands set successfully!"
echo ""
echo "You can verify by opening your bot and typing '/' to see the commands."

