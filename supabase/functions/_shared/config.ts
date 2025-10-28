/**
 * Централизованное управление конфигурацией приложения
 * 
 * Этот модуль обеспечивает:
 * - Единую точку доступа к переменным окружения
 * - Валидацию конфигурации при старте
 * - Типобезопасность для всех настроек
 * - Правильные URL форматы для разных окружений
 */

import { Environment } from './types.ts';

export class Config {
  private static instance: Config;
  private env: Environment & { ENVIRONMENT?: string };

  private constructor() {
    this.env = this.loadEnvironment();
    this.validate();
  }

  /**
   * Получить единственный экземпляр Config (Singleton)
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Загрузить переменные окружения
   */
  private loadEnvironment(): Environment & { ENVIRONMENT?: string } {
    const envObject = Deno.env.toObject();
    
    return {
      TELEGRAM_BOT_TOKEN: envObject.TELEGRAM_BOT_TOKEN || '',
      GEMINI_API_KEY: envObject.GEMINI_API_KEY || '',
      GOOGLE_MAPS_API_KEY: envObject.GOOGLE_MAPS_API_KEY || '',
      SUPABASE_URL: envObject.SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: envObject.SUPABASE_SERVICE_ROLE_KEY || '',
      ENVIRONMENT: envObject.ENVIRONMENT || 'production',
    };
  }

  /**
   * Валидация обязательных переменных окружения
   */
  private validate(): void {
    const required: Array<keyof Environment> = [
      'TELEGRAM_BOT_TOKEN',
      'GEMINI_API_KEY',
      'GOOGLE_MAPS_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    
    const missing = required.filter(key => !this.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Проверка формата Supabase URL
    if (this.env.SUPABASE_URL && !this.env.SUPABASE_URL.includes('supabase.co')) {
      console.warn('⚠️  Warning: SUPABASE_URL does not look like a valid Supabase URL');
    }
  }

  // Геттеры для переменных окружения
  
  get supabaseUrl(): string {
    return this.env.SUPABASE_URL;
  }

  get supabaseKey(): string {
    return this.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  get telegramToken(): string {
    return this.env.TELEGRAM_BOT_TOKEN;
  }

  get geminiKey(): string {
    return this.env.GEMINI_API_KEY;
  }

  get mapsKey(): string {
    return this.env.GOOGLE_MAPS_API_KEY;
  }

  get environment(): string {
    return this.env.ENVIRONMENT || 'production';
  }

  // Хелперы для определения окружения
  
  get isProduction(): boolean {
    return this.environment === 'production';
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isStaging(): boolean {
    return this.environment === 'staging';
  }

  /**
   * Получить правильный webhook URL для Telegram
   * ВАЖНО: Использует .functions.supabase.co формат для публичного доступа
   * 
   * @param projectId - ID проекта Supabase
   * @returns Правильный URL для webhook
   */
  getWebhookUrl(projectId: string): string {
    return `https://${projectId}.functions.supabase.co/telegram-webhook`;
  }

  /**
   * Извлечь project ID из Supabase URL
   * 
   * @returns Project ID или null если не удалось извлечь
   */
  getProjectIdFromUrl(): string | null {
    const url = this.supabaseUrl;
    const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    return match ? match[1] : null;
  }

  /**
   * Получить правильный webhook URL на основе текущей конфигурации
   */
  getCurrentWebhookUrl(): string {
    const projectId = this.getProjectIdFromUrl();
    if (!projectId) {
      throw new Error('Could not extract project ID from SUPABASE_URL');
    }
    return this.getWebhookUrl(projectId);
  }

  /**
   * Вывести текущую конфигурацию (без чувствительных данных)
   */
  printConfig(): void {
    console.log('📋 Configuration:');
    console.log(`   Environment: ${this.environment}`);
    console.log(`   Supabase URL: ${this.supabaseUrl}`);
    console.log(`   Telegram token: ${this.telegramToken ? '✓ Set' : '✗ Missing'}`);
    console.log(`   Gemini API key: ${this.geminiKey ? '✓ Set' : '✗ Missing'}`);
    console.log(`   Maps API key: ${this.mapsKey ? '✓ Set' : '✗ Missing'}`);
    
    const projectId = this.getProjectIdFromUrl();
    if (projectId) {
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Webhook URL: ${this.getCurrentWebhookUrl()}`);
    }
  }
}

/**
 * Хелпер для быстрого получения конфигурации
 */
export function getConfig(): Config {
  return Config.getInstance();
}

