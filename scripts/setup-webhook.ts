#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Автоматическая настройка Telegram Webhook с правильным URL форматом
 * 
 * Использование:
 *   deno run --allow-env --allow-net scripts/setup-webhook.ts
 * 
 * Требуемые переменные окружения:
 *   - TELEGRAM_BOT_TOKEN
 *   - SUPABASE_PROJECT_ID
 *   - ENVIRONMENT (optional, default: production)
 */

interface WebhookConfig {
  botToken: string;
  projectId: string;
  environment: string;
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

/**
 * Получение конфигурации из переменных окружения
 */
function getConfig(): WebhookConfig {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const projectId = Deno.env.get('SUPABASE_PROJECT_ID');
  const environment = Deno.env.get('ENVIRONMENT') || 'production';

  if (!botToken) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN environment variable is required');
    Deno.exit(1);
  }

  if (!projectId) {
    console.error('❌ Error: SUPABASE_PROJECT_ID environment variable is required');
    Deno.exit(1);
  }

  return { botToken, projectId, environment };
}

/**
 * Генерация правильного webhook URL
 * ВАЖНО: Используем .functions.supabase.co формат для публичного доступа
 */
function getWebhookUrl(projectId: string): string {
  return `https://${projectId}.functions.supabase.co/telegram-webhook`;
}

/**
 * Установка webhook
 */
async function setWebhook(config: WebhookConfig): Promise<boolean> {
  const webhookUrl = getWebhookUrl(config.projectId);

  console.log('🔧 Setting up Telegram webhook...');
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`📍 URL: ${webhookUrl}`);
  console.log('');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
          drop_pending_updates: false,
        }),
      }
    );

    const result: TelegramResponse = await response.json();

    if (result.ok) {
      console.log('✅ Webhook successfully set!');
      return true;
    } else {
      console.error('❌ Failed to set webhook:', result.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    return false;
  }
}

/**
 * Проверка статуса webhook
 */
async function checkWebhookInfo(botToken: string): Promise<void> {
  console.log('');
  console.log('🔍 Checking webhook status...');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    const result: TelegramResponse = await response.json();

    if (result.ok && result.result) {
      const info = result.result;
      console.log('');
      console.log('📊 Webhook Info:');
      console.log(`   URL: ${info.url}`);
      console.log(`   Has custom certificate: ${info.has_custom_certificate}`);
      console.log(`   Pending update count: ${info.pending_update_count}`);
      console.log(`   Max connections: ${info.max_connections || 40}`);
      
      if (info.last_error_date) {
        console.log(`   ⚠️  Last error: ${info.last_error_message}`);
        console.log(`   ⚠️  Last error date: ${new Date(info.last_error_date * 1000).toISOString()}`);
      } else {
        console.log('   ✅ No errors');
      }

      // Проверка правильности URL формата
      if (info.url.includes('.functions.supabase.co')) {
        console.log('');
        console.log('✅ URL format is correct! (.functions.supabase.co)');
      } else if (info.url.includes('.supabase.co/functions/v1/')) {
        console.log('');
        console.log('⚠️  WARNING: URL uses old format (.supabase.co/functions/v1/)');
        console.log('   This format requires JWT authentication and may cause 401 errors!');
        console.log('   Run this script again to fix the URL.');
      }
    }
  } catch (error) {
    console.error('❌ Error checking webhook info:', error);
  }
}

/**
 * Main
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Telegram Webhook Setup Script');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const config = getConfig();
  const success = await setWebhook(config);

  if (success) {
    await checkWebhookInfo(config.botToken);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Setup completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    Deno.exit(0);
  } else {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('❌ Setup failed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    Deno.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main();
}

