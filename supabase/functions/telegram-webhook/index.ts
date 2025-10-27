// Main Telegram Webhook Handler - Entry point for all Telegram updates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Orchestrator } from '../_shared/orchestrator.ts';
import { TelegramUpdate, Environment } from '../_shared/types.ts';
import { validateEnv } from '../_shared/utils.ts';

// CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse Telegram update
    const update: TelegramUpdate = await req.json();

    console.log('Received update:', JSON.stringify(update, null, 2));

    // Validate update has required fields
    if (!update.update_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    return new Response(
      JSON.stringify({ ok: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

