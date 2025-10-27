// Orchestrator - core business logic and request routing

import { SessionManager } from './session-manager.ts';
import { UserManager } from './user-manager.ts';
import { GeminiClient } from './gemini-client.ts';
import { TelegramClient } from './telegram-client.ts';
import {
  formatPlacesMessage,
  formatWelcomeMessage,
  createPlaceButtons,
  formatReviewsMessage,
} from './telegram-formatter.ts';
import { TelegramUpdate, PlaceResult, Location } from './types.ts';
import { MESSAGES } from './constants.ts';
import { isFollowUpQuestion, extractOrdinal } from './utils.ts';
import { ContextHandler } from './context-handler.ts';

export class Orchestrator {
  private sessionManager: SessionManager;
  private userManager: UserManager;
  private geminiClient: GeminiClient;
  private telegramClient: TelegramClient;
  private contextHandler: ContextHandler;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    telegramToken: string,
    geminiApiKey: string,
    mapsApiKey: string
  ) {
    console.log('Orchestrator: Initializing...');
    console.log('Orchestrator: Creating SessionManager...');
    this.sessionManager = new SessionManager(supabaseUrl, supabaseKey);
    console.log('Orchestrator: SessionManager created');
    console.log('Orchestrator: Creating UserManager...');
    this.userManager = new UserManager(supabaseUrl, supabaseKey);
    console.log('Orchestrator: UserManager created');
    console.log('Orchestrator: Creating GeminiClient...');
    this.geminiClient = new GeminiClient(geminiApiKey, mapsApiKey);
    console.log('Orchestrator: GeminiClient created');
    console.log('Orchestrator: Creating TelegramClient...');
    this.telegramClient = new TelegramClient(telegramToken);
    console.log('Orchestrator: TelegramClient created');
    console.log('Orchestrator: Creating ContextHandler...');
    this.contextHandler = new ContextHandler();
    console.log('Orchestrator: Initialized successfully');
  }

  /**
   * Main entry point - process incoming Telegram update
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    console.log('processUpdate called');
    
    try {
      if (update.message) {
        console.log('Handling message:', update.message.text || 'location/text');
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        console.log('Handling callback query');
        await this.handleCallbackQuery(update.callback_query);
      }
      console.log('processUpdate completed successfully');
    } catch (error) {
      console.error('ERROR in processUpdate:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      // Send error message to user
      const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;
      console.log('Sending error message to chatId:', chatId);
      
      if (chatId) {
        try {
          await this.telegramClient.sendMessage({
            chatId,
            text: MESSAGES.ERROR_GENERIC,
          });
          console.log('Error message sent to user');
        } catch (sendError) {
          console.error('Failed to send error message to user:', sendError);
        }
      } else {
        console.error('No chatId found in update');
      }
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: any): Promise<void> {
    const userId = message.from.id;
    const chatId = message.chat.id;

    // Get or create user
    await this.userManager.getOrCreateUser(message.from);

    // Get or create session
    await this.sessionManager.getOrCreateSession(userId);

    // Handle different message types
    if (message.text?.startsWith('/')) {
      await this.handleCommand(message);
    } else if (message.location) {
      await this.handleLocation(message);
    } else if (message.text) {
      await this.handleTextQuery(message);
    }
  }

  /**
   * Handle commands (/start, /help, etc.)
   */
  private async handleCommand(message: any): Promise<void> {
    const command = message.text.split(' ')[0];
    const chatId = message.chat.id;
    const userId = message.from.id;

    console.log(`HandleCommand: Received command "${command}" from chatId ${chatId}`);

    switch (command) {
      case '/start':
        console.log('HandleCommand: Processing /start command');
        const welcomeMsg = formatWelcomeMessage(message.from.first_name);
        console.log('HandleCommand: Sending welcome message...');
        await this.telegramClient.sendMessage({
          chatId,
          text: welcomeMsg,
          replyMarkup: this.telegramClient.createLocationButton('📍 Поделиться геолокацией'),
        });
        console.log('HandleCommand: Welcome message sent successfully');
        break;

      case '/help':
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.HELP,
        });
        break;

      case '/location':
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.LOCATION_REQUEST,
          replyMarkup: this.telegramClient.createLocationButton('📍 Поделиться геолокацией'),
        });
        break;

      default:
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Неизвестная команда. Напиши /help для справки.',
        });
    }
  }

  /**
   * Handle location sharing
   */
  private async handleLocation(message: any): Promise<void> {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const location = message.location;

    // Save location to session
    await this.sessionManager.updateLocation(userId, {
      lat: location.latitude,
      lon: location.longitude,
    });

    await this.telegramClient.sendMessage({
      chatId,
      text: MESSAGES.LOCATION_RECEIVED,
      replyMarkup: this.telegramClient.removeKeyboard(),
    });
  }

  /**
   * Handle text query (main search flow)
   */
  private async handleTextQuery(message: any): Promise<void> {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const query = message.text;

    // Check if user has valid location
    const location = await this.sessionManager.getValidLocation(userId);
    
    if (!location) {
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.LOCATION_REQUEST,
        replyMarkup: this.telegramClient.createLocationButton('📍 Поделиться геолокацией'),
      });
      return;
    }

    // Send typing indicator
    await this.telegramClient.sendTyping(chatId);

    // Check if this is a follow-up question
    const isFollowUp = isFollowUpQuestion(query);
    
    if (isFollowUp) {
      await this.handleFollowUpQuery(userId, chatId, query, location);
      return;
    }

    // Regular search flow
    await this.handleSearchQuery(userId, chatId, query, location);
  }

  /**
   * Handle regular search query
   */
  private async handleSearchQuery(
    userId: number,
    chatId: number,
    query: string,
    location: Location
  ): Promise<void> {
    try {
      // Get user preferences for context
      const preferences = await this.userManager.getUserPreferences(userId);

      // Search for places based on the query
      const places = await this.geminiClient.searchPlaces(
        query,
        location
      );

      // Log search results with distances for debugging
      console.log('Search results with distances:', places.map(p => 
        `${p.name} - ${p.distance ? p.distance + 'm' : 'unknown distance'}`
      ));

      // Get Gemini's interpretation AFTER we have places
      const geminiResponse = await this.geminiClient.search({
        query,
        location,
        context: preferences ? { user_preferences: preferences } : undefined,
      });

      if (places.length === 0) {
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.ERROR_NO_RESULTS,
        });
        return;
      }

      // Save search context
      await this.sessionManager.saveSearchContext(userId, query, places);

      // Send results
      const messageText = formatPlacesMessage(places, geminiResponse.text);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: messageText,
        parseMode: 'Markdown',
        replyMarkup: this.telegramClient.createInlineKeyboard(
          createPlaceButtons(places[0], 0)
        ),
      });

    } catch (error) {
      console.error('Search error:', error);
      
      // Send user-friendly error message
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.ERROR_GENERIC,
      });
    }
  }

  /**
   * Handle follow-up query (e.g., "а у второго есть парковка?")
   */
  private async handleFollowUpQuery(
    userId: number,
    chatId: number,
    query: string,
    location: Location
  ): Promise<void> {
    // Get last results
    const lastResults = await this.sessionManager.getLastResults(userId);
    
    if (!lastResults || lastResults.length === 0) {
      await this.telegramClient.sendMessage({
        chatId,
        text: 'Не могу найти предыдущие результаты. Попробуй новый поиск.',
      });
      return;
    }

    // Extract which place user is asking about
    const placeIndex = extractOrdinal(query);
    
    if (placeIndex && placeIndex <= lastResults.length) {
      const place = lastResults[placeIndex - 1];
      
      // Get detailed info about this place
      const details = await this.geminiClient.getPlaceDetails(place.place_id);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: this.contextHandler.formatPlaceAnswer(details, query),
        parseMode: 'Markdown',
        replyMarkup: this.telegramClient.createInlineKeyboard(
          createPlaceButtons(details, placeIndex - 1)
        ),
      });
    } else {
      // General follow-up question, send to Gemini with context
      const session = await this.sessionManager.getSession(userId);
      
      const geminiResponse = await this.geminiClient.search({
        query,
        location,
        context: {
          last_query: session?.last_query || undefined,
          last_results: lastResults,
        },
      });

      await this.telegramClient.sendMessage({
        chatId,
        text: geminiResponse.text,
        parseMode: 'Markdown',
      });
    }
  }

  /**
   * Handle callback query (button press)
   */
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Answer callback query immediately
    await this.telegramClient.answerCallbackQuery(callbackQuery.id);

    // Parse callback data
    const [action, indexStr, placeId] = data.split('_');
    const index = parseInt(indexStr);

    if (action === 'reviews') {
      console.log(`Reviews callback: placeId=${placeId}, index=${index}`);
      
      // Валидация place_id
      if (!placeId || placeId.trim() === '' || placeId === 'undefined') {
        console.error('Invalid place_id:', placeId);
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Ошибка: некорректный идентификатор места.',
        });
        return;
      }
      
      await this.telegramClient.sendTyping(chatId);
      
      try {
        console.log('Fetching place details with reviews...');
        const details = await this.geminiClient.getPlaceDetails(placeId, true);
        console.log(`Place details fetched: ${details.name}, reviews: ${details.reviews?.length || 0}, photos: ${details.photos?.length || 0}`);
        
        // Проверка: есть ли хоть что-то для отправки
        const hasPhotos = details.photos && details.photos.length > 0;
        const hasReviews = details.reviews && details.reviews.length > 0;
        
        if (!hasPhotos && !hasReviews) {
          await this.telegramClient.sendMessage({
            chatId,
            text: `К сожалению, для места "${details.name}" пока нет отзывов и фотографий.`,
          });
          return;
        }
        
        // Send photos if available
        if (hasPhotos) {
          console.log(`Sending ${details.photos.length} photos...`);
          try {
            await this.telegramClient.sendPhotoGroup(
              chatId,
              details.photos,
              (ref, maxWidth) => this.geminiClient.getPhotoUrl(ref, maxWidth)
            );
            console.log('Photos sent successfully');
          } catch (photoError) {
            console.error('Failed to send photos:', photoError);
            // Continue without photos
          }
        }
        
        // Send reviews if available
        if (hasReviews) {
          console.log('Sending reviews message...');
          try {
            const reviewsText = formatReviewsMessage(details);
            console.log(`Reviews text length: ${reviewsText.length}`);
            await this.telegramClient.sendMessage({
              chatId,
              text: reviewsText,
            });
            console.log('Reviews sent successfully');
          } catch (msgError) {
            console.error('Failed to send reviews:', msgError);
            await this.telegramClient.sendMessage({
              chatId,
              text: 'Не удалось отправить отзывы. Попробуйте позже.',
            });
          }
        } else if (hasPhotos) {
          // Есть фото, но нет отзывов
          await this.telegramClient.sendMessage({
            chatId,
            text: `Фотографии ${details.name} отправлены. Отзывы пока недоступны.`,
          });
        }
        
      } catch (error) {
        console.error('Error in reviews callback:', error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        
        // Отправить понятное сообщение в зависимости от ошибки
        let userMessage = 'Не удалось загрузить информацию о месте. ';
        
        if (error instanceof Error) {
          if (error.message.includes('INVALID_REQUEST')) {
            userMessage += 'Информация о месте устарела.';
          } else if (error.message.includes('NOT_FOUND')) {
            userMessage += 'Место не найдено или удалено.';
          } else if (error.message.includes('удалено')) {
            userMessage += error.message;
          } else {
            userMessage += 'Попробуйте другое место.';
          }
        }
        
        await this.telegramClient.sendMessage({
          chatId,
          text: userMessage,
        });
      }
    } else if (action === 'next') {
      // Show next place from search results
      const lastResults = await this.sessionManager.getLastResults(userId);
      
      if (!lastResults || lastResults.length === 0) {
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Нет сохраненных результатов поиска.',
        });
        return;
      }

      const nextIndex = (index + 1) % lastResults.length;
      const nextPlace = lastResults[nextIndex];

      if (!nextPlace) {
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Больше мест не найдено.',
        });
        return;
      }

      // Format and send next place
      const messageText = formatPlacesMessage([nextPlace], '➡️ Следующее место:');
      
      await this.telegramClient.sendMessage({
        chatId,
        text: messageText,
        parseMode: 'Markdown',
        replyMarkup: this.telegramClient.createInlineKeyboard(
          createPlaceButtons(nextPlace, nextIndex)
        ),
      });
    } else if (action === 'info') {
      // Get detailed info
      const details = await this.geminiClient.getPlaceDetails(placeId);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: this.contextHandler.formatDetailedInfo(details),
        parseMode: 'Markdown',
      });
    } else if (action === 'select') {
      // User selected a place - could track this for analytics
      await this.telegramClient.answerCallbackQuery(
        callbackQuery.id,
        'Выбрано! Что еще найти?',
        false
      );
    }
  }
}

