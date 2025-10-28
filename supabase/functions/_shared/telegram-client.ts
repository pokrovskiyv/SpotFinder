// Telegram Client - handles communication with Telegram Bot API

import { TELEGRAM_API_BASE, MAX_MESSAGE_LENGTH } from './constants.ts';
import { truncateText } from './utils.ts';
import { PlacePhoto } from './types.ts';

export interface SendMessageOptions {
  text: string;
  chatId: number;
  replyMarkup?: unknown;
  parseMode?: 'Markdown' | 'HTML';
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export class TelegramClient {
  private botToken: string;
  private apiBase: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiBase = `${TELEGRAM_API_BASE}/bot${botToken}`;
  }

  /**
   * Send text message to user
   */
  async sendMessage(options: SendMessageOptions): Promise<void> {
    const { text, chatId, replyMarkup, parseMode } = options;

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: truncateText(text, MAX_MESSAGE_LENGTH),
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(chatId: number): Promise<void> {
    await fetch(`${this.apiBase}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing',
      }),
    });
  }

  /**
   * Create inline keyboard with buttons
   */
  createInlineKeyboard(buttons: InlineButton[][]): unknown {
    return {
      inline_keyboard: buttons,
    };
  }

  /**
   * Create location sharing button
   */
  createLocationButton(text: string): unknown {
    return {
      keyboard: [[{
        text,
        request_location: true,
      }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /**
   * Remove keyboard
   */
  removeKeyboard(): unknown {
    return {
      remove_keyboard: true,
    };
  }

  /**
   * Answer callback query (from inline button press)
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
    };

    if (text) {
      payload.text = text;
      payload.show_alert = showAlert;
    }

    await fetch(`${this.apiBase}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send location
   */
  async sendLocation(
    chatId: number,
    latitude: number,
    longitude: number
  ): Promise<void> {
    await fetch(`${this.apiBase}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        latitude,
        longitude,
      }),
    });
  }

  /**
   * Edit message text (for updating previous messages)
   */
  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    replyMarkup?: unknown
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text: truncateText(text, MAX_MESSAGE_LENGTH),
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${this.apiBase}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to edit message: ${error}`);
      // Don't throw - editing can fail if message is too old
    }
  }

  /**
   * Set webhook URL
   */
  async setWebhook(url: string): Promise<void> {
    const response = await fetch(`${this.apiBase}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set webhook: ${error}`);
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<unknown> {
    const response = await fetch(`${this.apiBase}/getWebhookInfo`);
    if (!response.ok) {
      throw new Error('Failed to get webhook info');
    }
    return response.json();
  }

  /**
   * Send photo group (media group) - up to 10 photos
   * Returns true if successful, false otherwise
   */
  async sendPhotoGroup(
    chatId: number,
    photos: PlacePhoto[],
    getPhotoUrl: (photoReference: string, maxWidth?: number) => string | null
  ): Promise<boolean> {
    if (photos.length === 0) return false;
    
    // Limit to 10 photos (Telegram limit for media groups)
    const photosToSend = photos.slice(0, 10);

    // Filter out invalid photos and generate URLs
    const validMedia = photosToSend
      .map((photo) => {
        if (!photo.photo_reference) {
          console.warn('Photo missing photo_reference, skipping');
          return null;
        }
        
        const photoUrl = getPhotoUrl(photo.photo_reference, 800);
        if (!photoUrl) {
          console.warn(`Failed to generate URL for photo reference: ${photo.photo_reference.substring(0, 50)}`);
          return null;
        }
        
        return {
          type: 'photo' as const,
          media: photoUrl,
        };
      })
      .filter((media): media is { type: 'photo'; media: string } => media !== null);

    if (validMedia.length === 0) {
      console.warn('No valid photos to send in group');
      return false;
    }

    console.log(`Attempting to send ${validMedia.length} photos in media group`);

    try {
      const response = await fetch(`${this.apiBase}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          media: validMedia,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send photo group (status ${response.status}):`, errorText);
        return false;
      }

      console.log('Photo group sent successfully');
      return true;
    } catch (error) {
      console.error('Exception while sending photo group:', error);
      return false;
    }
  }

  /**
   * Send invoice for Telegram Stars payment
   */
  async sendInvoice(options: {
    chatId: number;
    title: string;
    description: string;
    payload: string;
    amount: number;
    currency?: string;
  }): Promise<void> {
    const { chatId, title, description, payload, amount, currency = 'XTR' } = options;

    const response = await fetch(`${this.apiBase}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        title,
        description,
        payload,
        provider_token: '', // Empty string for Telegram Stars (XTR)
        currency,
        prices: [{ label: 'Поддержка бота', amount: amount }], // amount in Stars (cents)
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send invoice: ${error}`);
    }
  }

  /**
   * Answer pre-checkout query to approve payment
   */
  async answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    errorMessage?: string
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
    };

    if (!ok && errorMessage) {
      payload.error_message = errorMessage;
    }

    await fetch(`${this.apiBase}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send photo with caption
   * Returns true if successful, false otherwise
   */
  async sendPhoto(options: {
    chatId: number;
    photo: string; // URL or file_id
    caption?: string;
    replyMarkup?: unknown;
    parseMode?: 'Markdown' | 'HTML';
  }): Promise<boolean> {
    const { chatId, photo, caption, replyMarkup, parseMode } = options;

    // Log photo URL for debugging (truncate if too long)
    const photoPreview = photo.length > 100 ? `${photo.substring(0, 100)}...` : photo;
    console.log(`Attempting to send photo to chat ${chatId}: ${photoPreview}`);

    // Validate photo URL if it's a URL (not a file_id)
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      // Check if URL is properly formatted
      try {
        const url = new URL(photo);
        console.log(`Photo URL validated: ${url.protocol}//${url.hostname}${url.pathname}`);
      } catch (error) {
        console.error('Invalid photo URL format:', photo);
        return false;
      }
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      photo,
    };

    if (caption) {
      payload.caption = truncateText(caption, 1024); // Max caption length
    }

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    try {
      const response = await fetch(`${this.apiBase}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send photo (status ${response.status}):`, errorText);
        console.error(`Photo URL was: ${photoPreview}`);
        return false;
      }

      console.log('Photo sent successfully');
      return true;
    } catch (error) {
      console.error('Exception while sending photo:', error);
      console.error(`Photo URL was: ${photoPreview}`);
      return false;
    }
  }
}

