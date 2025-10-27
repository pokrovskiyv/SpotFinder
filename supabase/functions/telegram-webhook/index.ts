/* @supabase/functions-ignore */
// Main Telegram Webhook Handler - Entry point for all Telegram updates

console.info('telegram-webhook started');

import { Orchestrator } from '../_shared/orchestrator.ts';
import { TelegramUpdate, Environment } from '../_shared/types.ts';
import { validateEnv } from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Принимаем только POST на /telegram-webhook
  if (req.method !== 'POST' || !url.pathname.endsWith('/telegram-webhook')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    // Validate environment variables
    validateEnv(Deno.env.toObject(), [
      'TELEGRAM_BOT_TOKEN',
      'GEMINI_API_KEY',
      'GOOGLE_MAPS_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]);

    const env = Deno.env.toObject() as unknown as Environment;

    // Не проверяем Authorization, просто читаем update
    const update: TelegramUpdate = await req.json().catch(() => null);
    
    if (!update || !update.update_id) {
      console.error('Invalid update received');
      return new Response('Bad request', { status: 400 });
    }

    console.log('Received update:', JSON.stringify(update, null, 2));

    // Initialize orchestrator
    const orchestrator = new Orchestrator(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      env.TELEGRAM_BOT_TOKEN,
      env.GEMINI_API_KEY,
      env.GOOGLE_MAPS_API_KEY
    );

    // Process update asynchronously
    // We respond to Telegram immediately and process in background
    orchestrator.processUpdate(update).catch((error) => {
      console.error('Error processing update:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    });

    console.log('Responding to Telegram with 200 OK');
    
    // Respond to Telegram immediately
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
