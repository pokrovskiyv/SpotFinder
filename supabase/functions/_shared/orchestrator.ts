// Orchestrator - core business logic and request routing

import { SessionManager } from './session-manager.ts';
import { UserManager } from './user-manager.ts';
import { GeminiClient } from './gemini-client.ts';
import { TelegramClient } from './telegram-client.ts';
import { DonationManager } from './donation-manager.ts';
import { UserActionTracker } from './user-action-tracker.ts';
import {
  formatPlacesMessage,
  formatWelcomeMessage,
  createPlaceButtons,
  formatReviewsMessage,
  createDonateButtons,
  createDonateButton,
  formatRouteMessage,
  createRouteButton,
  createMultiPlaceButtons,
} from './telegram-formatter.ts';
import { TelegramUpdate, PlaceResult, Location, QuotaExceededError, DBSession } from './types.ts';
import { MESSAGES, DONATE_AMOUNTS } from './constants.ts';
import { isFollowUpQuestion, extractOrdinal, extractMultipleOrdinals, extractCityFromQuery, isRouteRequest, extractPlaceIndices, buildMultiStopRouteUrl, isMultiPlaceRequest, extractPlaceCount } from './utils.ts';
import { ContextHandler } from './context-handler.ts';
import { extractFiltersFromQuery } from './filter-extractor.ts';
import { sortAndFilterPlaces } from './places-sorter.ts';

export class Orchestrator {
  private sessionManager: SessionManager;
  private userManager: UserManager;
  private geminiClient: GeminiClient;
  private telegramClient: TelegramClient;
  private contextHandler: ContextHandler;
  private donationManager: DonationManager;
  private actionTracker: UserActionTracker;

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
    console.log('Orchestrator: Creating GeminiClient with cache and cost tracking...');
    this.geminiClient = new GeminiClient(geminiApiKey, mapsApiKey, supabaseUrl, supabaseKey);
    console.log('Orchestrator: GeminiClient created');
    console.log('Orchestrator: Creating TelegramClient...');
    this.telegramClient = new TelegramClient(telegramToken);
    console.log('Orchestrator: TelegramClient created');
    console.log('Orchestrator: Creating DonationManager...');
    this.donationManager = new DonationManager(supabaseUrl, supabaseKey);
    console.log('Orchestrator: DonationManager created');
    console.log('Orchestrator: Creating UserActionTracker...');
    this.actionTracker = new UserActionTracker(supabaseUrl, supabaseKey);
    console.log('Orchestrator: UserActionTracker created');
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
      if (update.pre_checkout_query) {
        console.log('Handling pre-checkout query');
        await this.handlePreCheckout(update.pre_checkout_query);
      } else if (update.message) {
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
    if (message.successful_payment) {
      await this.handleSuccessfulPayment(message);
    } else if (message.text?.startsWith('/')) {
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

      case '/donate':
        console.log('HandleCommand: Processing /donate command');
        await this.handleDonateCommand(message);
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

    // Check if user has valid location (needed for fallback if city geocoding fails)
    const userLocation = await this.sessionManager.getValidLocation(userId);
    
    // Try to extract city from query
    const cityName = extractCityFromQuery(query);
    let searchLocation = userLocation;
    let cityGeocoded = false;

    if (cityName) {
      console.log(`City detected in query: "${cityName}"`);
      
      // Try to geocode the city
      const cityLocation = await this.geminiClient.geocodeCity(cityName, userId);
      
      if (cityLocation) {
        searchLocation = cityLocation;
        cityGeocoded = true;
        console.log(`Using geocoded location for "${cityName}": ${cityLocation.lat}, ${cityLocation.lon}`);
      } else {
        console.warn(`Failed to geocode city "${cityName}"`);
        
        // If user has no location, ask them to share it
        if (!userLocation) {
          await this.telegramClient.sendMessage({
            chatId,
            text: `Не могу найти город "${cityName}". Пожалуйста, поделись геолокацией, чтобы я мог помочь.`,
            replyMarkup: this.telegramClient.createLocationButton('📍 Поделиться геолокацией'),
          });
          return;
        }
        // Otherwise use user location as fallback
        console.log(`Using user location as fallback for failed city geocoding`);
      }
    }

    // If no user location at all (needed as fallback), request it
    if (!searchLocation) {
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.LOCATION_REQUEST,
        replyMarkup: this.telegramClient.createLocationButton('📍 Поделиться геолокацией'),
      });
      return;
    }

    // Send typing indicator
    await this.telegramClient.sendTyping(chatId);

    // Check if this is a route request
    const isRoute = isRouteRequest(query);
    
    if (isRoute) {
      await this.handleRouteRequest(userId, chatId, query, searchLocation!);
      return;
    }

    // Check if this is a follow-up question
    const isFollowUp = isFollowUpQuestion(query);
    
    if (isFollowUp) {
      await this.handleFollowUpQuery(userId, chatId, query, searchLocation!);
      return;
    }

    // Send confirmation message if searching in a different city
    if (cityGeocoded && cityName) {
      await this.telegramClient.sendMessage({
        chatId,
        text: `🔍 Ищу в городе ${cityName}...`,
      });
    }

    // Regular search flow
    await this.handleSearchQuery(userId, chatId, query, searchLocation);
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
      // No preprocessing - let Gemini AI handle intent recognition through improved prompts
      console.log(`🔍 Processing query: "${query}"`);

      // Extract filters from user query
      const filters = await extractFiltersFromQuery(query, this.geminiClient['apiKey']);
      console.log('Extracted filters:', filters);

      // Get list of shown places from session (resets when location updates)
      const shownPlaceIds = await this.sessionManager.getShownPlaceIds(userId);
      console.log(`Excluding ${shownPlaceIds.length} previously shown places from session`);

      // Get user preferences for context
      const preferences = await this.userManager.getUserPreferences(userId);

      // Check if user wants multiple places
      const wantsMultiplePlaces = isMultiPlaceRequest(query);
      const requestedCount = extractPlaceCount(query);

      // Get Gemini's response with Maps Grounding
      // Gemini will understand intent through improved system prompts
      let geminiResponse;
      try {
        geminiResponse = await this.geminiClient.search({
          query,
          location,
          userId,
          context: preferences ? { user_preferences: preferences } : undefined,
          isRouteRequest: wantsMultiplePlaces, // Hint to Gemini to find multiple places
          filters, // Pass extracted filters
          excludePlaceIds: shownPlaceIds, // Exclude already shown places
        });
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          await this.telegramClient.sendMessage({
            chatId,
            text: error.cacheAvailable 
              ? MESSAGES.QUOTA_EXCEEDED_WITH_CACHE 
              : MESSAGES.QUOTA_EXCEEDED_NO_CACHE,
          });
          return;
        }
        throw error;
      }

      // Check if Gemini extracted a city from the query
      let searchLocation = location;

      if (geminiResponse.extractedCity) {
        console.log(`Gemini detected city in query: "${geminiResponse.extractedCity}"`);
        
        const cityLocation = await this.geminiClient.geocodeCity(geminiResponse.extractedCity, userId);
        
        if (cityLocation) {
          searchLocation = cityLocation;
          console.log(`Using geocoded location for "${geminiResponse.extractedCity}": ${cityLocation.lat}, ${cityLocation.lon}`);
          
          // Send confirmation message
          await this.telegramClient.sendMessage({
            chatId,
            text: `🔍 Ищу в городе ${geminiResponse.extractedCity}...`,
          });
        } else {
          console.warn(`Failed to geocode city "${geminiResponse.extractedCity}", using original location`);
        }
      }

      // Log search results
      console.log('Gemini returned places:', geminiResponse.places.length);

      // FALLBACK: If Gemini returned no places, try Google Places API with correct location
      let places = geminiResponse.places;
      let usedFallback = false;

      if (places.length === 0) {
        console.log('Gemini returned 0 places, trying Places API fallback...');
        
        const maxResults = wantsMultiplePlaces && requestedCount 
          ? Math.min(requestedCount, 5)
          : wantsMultiplePlaces 
          ? 5 
          : 3;
        
        // Use searchLocation (which may be geocoded city or user location)
        places = await this.geminiClient.searchNearbyPlaces(searchLocation, query, maxResults);
        usedFallback = true;
        
        if (places.length > 0) {
          console.log(`Places API fallback successful: found ${places.length} places`);
        }
      }

      // Log search results with distances for debugging
      console.log('Search results with distances:', places.map(p => 
        `${p.name} - ${p.distance ? p.distance + 'm' : 'unknown distance'}`
      ));

      // Get full place details for all places using hybrid approach
      const placesWithDetails = await Promise.all(
        places.map(async (place) => {
          let validPlaceId = place.place_id;
          
          // Check if place_id looks like a valid Google Place ID
          // Reject fake IDs starting with 'maps_'
          const isValidPlaceId = validPlaceId && 
            !validPlaceId.startsWith('maps_') &&
            (validPlaceId.startsWith('ChIJ') || validPlaceId.match(/^[A-Za-z0-9_-]{20,}$/));
          
          // If place_id is not valid, try to resolve it
          if (!isValidPlaceId) {
            console.log(`❌ Invalid place_id for "${place.name}", attempting to resolve...`);
            try {
              const resolvedId = await this.geminiClient.resolvePlaceId(
                place.name,
                place.address,
                place.maps_uri
              );
              if (resolvedId) {
                validPlaceId = resolvedId;
              }
            } catch (error) {
              console.error(`Failed to resolve place_id for ${place.name}:`, error);
            }
          }
          
          // Get full details if we have valid place_id
          if (validPlaceId) {
            try {
              console.log(`✓ Getting full details for "${place.name}" (${validPlaceId})`);
              const details = await this.geminiClient.getPlaceDetails(validPlaceId, true);
              // Merge with Grounding data, preserve maps_uri for fallback
              return { 
                ...place, 
                ...details, 
                place_id: validPlaceId,
                maps_uri: place.maps_uri || details.maps_uri 
              };
            } catch (error) {
              console.error(`Failed to get details for ${validPlaceId}:`, error);
              // Return place with basic info from Grounding
              return { ...place, place_id: validPlaceId };
            }
          }
          
          // Fallback: return with basic info from Grounding only
          console.log(`⚠️ Could not resolve place_id for "${place.name}", showing basic info`);
          return place;
        })
      );

      // Filter out cities and hotels from results
      const validPlaces = placesWithDetails.filter(p => {
        // Must have name
        if (!p.name || p.name === 'Без названия') return false;
        
        // Filter out cities - check if types include locality/political without specific place type
        if (p.types && Array.isArray(p.types)) {
          const hasLocalityType = p.types.includes('locality') || p.types.includes('political');
          const hasSpecificType = p.types.some(t => !['locality', 'political', 'geocode'].includes(t));
          
          // Exclude if it's ONLY a locality/political entity without specific place type
          if (hasLocalityType && !hasSpecificType) {
            console.log(`Filtering out city: "${p.name}" (types: ${p.types.join(', ')})`);
            return false;
          }
          
          // Filter out hotels/lodging for route/exploration queries
          if (wantsMultiplePlaces) {
            const isLodging = p.types.some(t => ['lodging', 'hotel'].includes(t));
            if (isLodging) {
              console.log(`Filtering out hotel from route query: "${p.name}" (types: ${p.types.join(', ')})`);
              return false;
            }
          }
        }
        
        // Fallback: Filter by name patterns if types not available (for Gemini Grounding results)
        if (wantsMultiplePlaces) {
          const nameMatches = /hotel|хотел|hostel|хостел|гостиниц|inn/i.test(p.name);
          if (nameMatches) {
            console.log(`Filtering out hotel by name pattern: "${p.name}"`);
            return false;
          }
        }
        
        return true;
      });

      // Filter out places without coordinates (can't build routes without them)
      const placesWithCoordinates = validPlaces.filter(p => {
        if (!p.geometry?.location) {
          console.warn(`⚠️ Excluding "${p.name}" from results - no coordinates available`);
          return false;
        }
        return true;
      });

      if (placesWithCoordinates.length === 0) {
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.ERROR_NO_RESULTS,
        });
        return;
      }

      // Apply smart sorting and filtering based on extracted filters
      const sortedPlaces = sortAndFilterPlaces(placesWithCoordinates, filters, searchLocation);
      console.log(`After filtering and sorting: ${sortedPlaces.length} places`);

      if (sortedPlaces.length === 0) {
        await this.telegramClient.sendMessage({
          chatId,
          text: '😞 К сожалению, не нашёл мест, соответствующих вашим критериям. Попробуйте изменить запрос.',
        });
        return;
      }

      // Save ALL sorted places to cache (up to 20 for pagination)
      const placesForCache = sortedPlaces.slice(0, 20);
      await this.sessionManager.savePlacesCache(userId, query, placesForCache);
      console.log(`Saved ${placesForCache.length} places to cache`);

      // Determine if we should show multiple places
      const showMultiple = wantsMultiplePlaces && sortedPlaces.length >= 2;
      
      // Show first 5 places
      const placesToShow = showMultiple && requestedCount
        ? sortedPlaces.slice(0, Math.min(requestedCount, 5))
        : showMultiple
        ? sortedPlaces.slice(0, 5)
        : sortedPlaces.slice(0, 5);
      
      // Save shown places to session history
      const newPlaceIds = placesToShow
        .map(p => p.place_id)
        .filter((id): id is string => id !== undefined);
      if (newPlaceIds.length > 0) {
        await this.sessionManager.addShownPlaceIds(userId, newPlaceIds);
      }
      console.log(`Saved ${newPlaceIds.length} places to session history`);

      // Save search context with limited places for routes and gemini response
      const searchId = await this.sessionManager.saveSearchContext(
        userId, 
        query, 
        placesToShow, 
        usedFallback ? undefined : geminiResponse.text
      );

      // Format message - use Gemini's AI text only if Gemini found places
      const introText = usedFallback ? undefined : geminiResponse.text;
      const messageText = formatPlacesMessage(
        placesToShow, 
        introText, 
        showMultiple
      );
      
      // Choose buttons based on number of places
      const buttons = showMultiple && placesToShow.length >= 2
        ? createMultiPlaceButtons(placesToShow, await this.sessionManager.getValidLocation(userId))
        : createPlaceButtons(sortedPlaces[0], 0);

      await this.telegramClient.sendMessage({
        chatId,
        text: messageText,
        parseMode: 'Markdown',
        replyMarkup: this.telegramClient.createInlineKeyboard(buttons),
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

    // Determine question type
    const questionType = this.contextHandler.determineQuestionType(query);
    
    console.log(`Follow-up question type: ${questionType}`);

    // Handle comparison questions
    if (questionType === 'comparison') {
      const placeIndices = extractMultipleOrdinals(query);
      
      let placesToCompare: PlaceResult[];
      
      if (placeIndices.length >= 2) {
        // User specified which places to compare
        placesToCompare = placeIndices
          .filter(idx => idx <= lastResults.length)
          .map(idx => lastResults[idx - 1]);
        
        console.log(`Comparing places by indices: ${placeIndices.join(', ')}`);
      } else if (placeIndices.length === 1) {
        // User specified one place, compare with the last one
        const idx = placeIndices[0];
        if (idx <= lastResults.length) {
          placesToCompare = [lastResults[idx - 1], lastResults[lastResults.length - 1]];
          console.log(`Comparing place ${idx} with last place`);
        } else {
          placesToCompare = lastResults.slice(0, 2);
        }
      } else {
        // No indices specified, use first two places
        placesToCompare = lastResults.slice(0, 2);
        console.log(`Comparing first two places`);
      }
      
      if (placesToCompare.length < 2) {
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Для сравнения нужно минимум два места из последних результатов.',
        });
        return;
      }
      
      // Format and send comparison
      const comparisonText = this.contextHandler.formatComparisonAnswer(placesToCompare, query);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: comparisonText,
        parseMode: 'Markdown',
      });
      
      return;
    }

    // Handle detail questions about specific place
    if (questionType === 'detail') {
      const placeIndex = extractOrdinal(query);
      const targetIndex = placeIndex || lastResults.length; // Default to last place
      
      if (targetIndex > lastResults.length) {
        await this.telegramClient.sendMessage({
          chatId,
          text: `Место №${targetIndex} не найдено. Всего показано ${lastResults.length} мест.`,
        });
        return;
      }
      
      const place = lastResults[targetIndex - 1];
      
      console.log(`Detail question about place ${targetIndex}: ${place.name}`);
      
      // Get detailed info if we have valid place_id
      let placeWithDetails = place;
      if (place.place_id && !place.place_id.startsWith('maps_')) {
        try {
          placeWithDetails = await this.geminiClient.getPlaceDetails(place.place_id);
        } catch (error) {
          console.error(`Failed to get place details: ${error}`);
          // Continue with basic info
        }
      }
      
      const answerText = this.contextHandler.formatPlaceAnswer(placeWithDetails, query);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: answerText,
        parseMode: 'Markdown',
        replyMarkup: place.place_id && !place.place_id.startsWith('maps_')
          ? this.telegramClient.createInlineKeyboard(
              createPlaceButtons(placeWithDetails, targetIndex - 1)
            )
          : undefined,
      });
      
      return;
    }

    // General follow-up question - send to Gemini with full context
    console.log(`General follow-up question, sending to Gemini with context`);
    
    const session = await this.sessionManager.getSession(userId);
    
    let geminiResponse;
    try {
      geminiResponse = await this.geminiClient.search({
        query: `Это уточняющий вопрос о ранее показанных местах.\n\nПредыдущий запрос: "${session?.last_query || 'неизвестно'}"\n\nНовый вопрос: ${query}`,
        location,
        userId,
        context: {
          last_query: session?.last_query || undefined,
          last_results: lastResults,
        },
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        await this.telegramClient.sendMessage({
          chatId,
          text: error.cacheAvailable 
            ? MESSAGES.QUOTA_EXCEEDED_WITH_CACHE 
            : MESSAGES.QUOTA_EXCEEDED_NO_CACHE,
        });
        return;
      }
      throw error;
    }

    await this.telegramClient.sendMessage({
      chatId,
      text: geminiResponse.text,
      parseMode: 'Markdown',
    });
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
    const parts = data.split('_');
    const action = parts[0];
    const indexStr = parts[1] || '';
    const placeId = parts.slice(2).join('_'); // In case place_id contains underscores
    const index = parseInt(indexStr) || 0;

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
      
      // Track action
      await this.actionTracker.trackAction(userId, 'view_reviews', {
        placeId,
        index,
      });
      
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
        if (hasPhotos && details.photos) {
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
            
            // Добавить сообщение с кнопкой доната
            await this.telegramClient.sendMessage({
              chatId,
              text: '💝 SpotFinder существует благодаря вашей поддержке!\n\nЕсли бот вам помогает, вы можете поддержать его развитие.',
              replyMarkup: this.telegramClient.createInlineKeyboard(
                createDonateButton()
              ),
            });
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
          
          // Добавить сообщение с кнопкой доната даже если нет отзывов
          await this.telegramClient.sendMessage({
            chatId,
            text: '💝 SpotFinder существует благодаря вашей поддержке!\n\nЕсли бот вам помогает, вы можете поддержать его развитие.',
            replyMarkup: this.telegramClient.createInlineKeyboard(
              createDonateButton()
            ),
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
      // Try to get next places from cache first
      const cached = await this.sessionManager.getNextCachedPlaces(userId, 5);
      
      if (cached && cached.places.length > 0) {
        // We have cached places - show them
        await this.sessionManager.updateCacheIndex(userId, cached.newIndex);
        
        // Save shown places to session history
        const newPlaceIds = cached.places
          .map(p => p.place_id)
          .filter((id): id is string => id !== undefined);
        if (newPlaceIds.length > 0) {
          await this.sessionManager.addShownPlaceIds(userId, newPlaceIds);
        }
        
        // Show cached places
        const messageText = formatPlacesMessage(
          cached.places,
          cached.hasMore ? '➡️ Следующие места:' : '➡️ Последние места в радиусе 5 км:'
        );
        
        await this.telegramClient.sendMessage({
          chatId,
          text: messageText,
          parseMode: 'Markdown',
          replyMarkup: this.telegramClient.createInlineKeyboard(
            createPlaceButtons(cached.places[0], 0)
          ),
        });
        
      } else {
        // Cache exhausted - search with increased radius
        const session = await this.sessionManager.getSession(userId);
        const lastQuery = session?.cache_query || session?.last_query;
        const location = await this.sessionManager.getValidLocation(userId);
        
        if (!lastQuery || !location) {
          await this.telegramClient.sendMessage({
            chatId,
            text: 'Сделайте новый поиск или обновите локацию.',
          });
          return;
        }
        
        await this.telegramClient.sendTyping(chatId);
        
        // Get shown places from session
        const shownPlaceIds = await this.sessionManager.getShownPlaceIds(userId);
        
        // Try increasing radius: 10km, then 20km
        const radiusSteps = [10000, 20000];
        let foundPlaces: PlaceResult[] = [];
        let usedRadius = 0;
        
        for (const radius of radiusSteps) {
          try {
            console.log(`Searching at radius ${radius}m with ${shownPlaceIds.length} excluded places`);
            const places = await this.geminiClient.searchNearbyPlaces(
              location,
              lastQuery,
              20,
              radius
            );
            
            // Exclude already shown places
            foundPlaces = places.filter(p => 
              p.place_id && !shownPlaceIds.includes(p.place_id)
            );
            
            if (foundPlaces.length > 0) {
              usedRadius = radius;
              console.log(`Found ${foundPlaces.length} new places at radius ${radius}m`);
              break;
            }
          } catch (error) {
            console.error(`Search failed at radius ${radius}:`, error);
          }
        }
        
        if (foundPlaces.length === 0) {
          const totalShown = shownPlaceIds.length;
          const timeLeft = this.getLocationTimeLeft(session);
          await this.telegramClient.sendMessage({
            chatId,
            text: `😞 Показал все ${totalShown} мест в радиусе 20 км.\n\n` +
                  `Попробуйте:\n` +
                  `• Другой запрос\n` +
                  `• Обновить локацию\n` +
                  `• Подождать немного (история обновится через ${timeLeft} мин)`,
          });
          return;
        }
        
        // Save new cache
        await this.sessionManager.savePlacesCache(userId, lastQuery, foundPlaces);
        
        // Show first 5
        const placesToShow = foundPlaces.slice(0, 5);
        
        // Add to session history
        const newPlaceIds = placesToShow
          .map(p => p.place_id)
          .filter((id): id is string => id !== undefined);
        if (newPlaceIds.length > 0) {
          await this.sessionManager.addShownPlaceIds(userId, newPlaceIds);
        }
        
        // Send with context about radius and count
        const totalShown = shownPlaceIds.length + newPlaceIds.length;
        const messageText = formatPlacesMessage(
          placesToShow,
          `🔍 Нашёл ещё места в радиусе ${usedRadius / 1000} км!\n(всего показано: ${totalShown})`
        );
        
        await this.telegramClient.sendMessage({
          chatId,
          text: messageText,
          parseMode: 'Markdown',
          replyMarkup: this.telegramClient.createInlineKeyboard(
            createPlaceButtons(placesToShow[0], 0)
          ),
        });
      }
    } else if (action === 'info') {
      // Get detailed info
      const details = await this.geminiClient.getPlaceDetails(placeId);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: this.contextHandler.formatDetailedInfo(details),
        parseMode: 'Markdown',
      });
    } else if (action === 'select') {
      // User selected a place - track for analytics
      await this.actionTracker.trackAction(userId, 'select_place', {
        placeId,
        index,
      });
      
      // Update search history with selected place
      await this.actionTracker.updateSearchWithSelection(userId, placeId);
      
      await this.telegramClient.answerCallbackQuery(
        callbackQuery.id,
        'Выбрано! Что еще найти?',
        false
      );
    } else if (action === 'donate') {
      // Handle donation buttons
      if (indexStr === 'menu') {
        // Handle "donate_menu" callback
        await this.handleDonateCommand({ chat: { id: chatId }, from: { id: userId } });
      } else {
        const amount = parseInt(indexStr);
        await this.sendDonationInvoice(userId, chatId, amount);
      }
    } else if (action === 'route' || data === 'route_all_0') {
      // Handle route callback
      const lastResults = await this.sessionManager.getLastResults(userId);
      
      if (!lastResults || lastResults.length < 2) {
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.ROUTE_ERROR_NOT_ENOUGH,
        });
        return;
      }
      
      // Track route view action
      await this.actionTracker.trackAction(userId, 'view_route', {
        placeCount: lastResults.length,
        placeIds: lastResults.map(p => p.place_id).filter(Boolean),
      });
      
      const userLocation = await this.sessionManager.getValidLocation(userId);
      
      // Log places for debugging
      console.log(`Building route with ${lastResults.length} places:`);
      lastResults.forEach((place, idx) => {
        console.log(`  Place ${idx + 1}: ${place.name}`);
        console.log(`    - place_id: ${place.place_id || 'missing'} (length: ${place.place_id?.length || 0})`);
        console.log(`    - has geometry: ${!!place.geometry?.location}`);
      });
      
      try {
        const routeUrl = buildMultiStopRouteUrl(userLocation, lastResults);
        console.log(`Route URL created successfully: ${routeUrl.substring(0, 100)}...`);
        const messageText = formatRouteMessage(lastResults);
        
        await this.telegramClient.sendMessage({
          chatId,
          text: messageText,
          parseMode: 'Markdown',
          replyMarkup: this.telegramClient.createInlineKeyboard(
            createRouteButton(routeUrl)
          ),
        });
      } catch (error) {
        console.error('Route building error:', error);
        await this.telegramClient.sendMessage({
          chatId,
          text: MESSAGES.ROUTE_ERROR_NOT_ENOUGH,
        });
      }
    }
  }

  /**
   * Handle /donate command - show donation options
   */
  private async handleDonateCommand(message: any): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;

    await this.telegramClient.sendMessage({
      chatId,
      text: MESSAGES.DONATE_INFO,
      replyMarkup: this.telegramClient.createInlineKeyboard(createDonateButtons()),
    });
  }

  /**
   * Get remaining time until location expires (in minutes)
   */
  private getLocationTimeLeft(session: DBSession | null): number {
    if (!session?.location_timestamp) return 0;
    
    const locationTime = new Date(session.location_timestamp).getTime();
    const now = Date.now();
    const ageMinutes = (now - locationTime) / 1000 / 60;
    const remainingMinutes = Math.max(0, 30 - ageMinutes);
    
    return Math.ceil(remainingMinutes);
  }

  /**
   * Send donation invoice to user
   */
  private async sendDonationInvoice(userId: number, chatId: number, amount: number): Promise<void> {
    const payload = JSON.stringify({
      userId,
      timestamp: Date.now(),
    });

    await this.telegramClient.sendInvoice({
      chatId,
      title: '⭐ Поддержать SpotFinder',
      description: 'Ваш донат помогает развивать бота и добавлять новые функции!',
      payload,
      amount,
      currency: 'XTR',
    });
  }

  /**
   * Handle pre-checkout query - approve payment
   */
  private async handlePreCheckout(query: any): Promise<void> {
    const queryId = query.id;
    const payload = query.invoice_payload;
    
    console.log('Pre-checkout query received:', queryId);
    
    // Validate payload and approve payment
    try {
      const payloadData = JSON.parse(payload);
      const amount = query.total_amount;
      
      // Validate amount range (1-2500 Stars)
      if (amount < 1 || amount > 2500) {
        await this.telegramClient.answerPreCheckoutQuery(
          queryId,
          false,
          MESSAGES.DONATE_INVALID_AMOUNT
        );
        return;
      }

      // Approve the payment
      await this.telegramClient.answerPreCheckoutQuery(queryId, true);
      console.log('Pre-checkout approved for query:', queryId);
    } catch (error) {
      console.error('Error processing pre-checkout:', error);
      await this.telegramClient.answerPreCheckoutQuery(
        queryId,
        false,
        'Ошибка обработки платежа'
      );
    }
  }

  /**
   * Handle successful payment - save to database and thank user
   */
  private async handleSuccessfulPayment(message: any): Promise<void> {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const payment = message.successful_payment;

    console.log('Handling successful payment:', payment);

    try {
      const paymentId = payment.telegram_payment_charge_id;
      const amount = payment.total_amount;

      // Check if this payment was already processed
      const alreadyProcessed = await this.donationManager.donationExists(paymentId);
      
      if (alreadyProcessed) {
        console.log('Payment already processed, skipping...');
        return;
      }

      // Create donation record
      await this.donationManager.createDonation(userId, amount, paymentId);

      // Get total donations for user
      const total = await this.donationManager.getTotalDonations(userId);

      // Track donation
      await this.actionTracker.trackAction(userId, 'donation', {
        amount,
        paymentId,
        totalDonated: total,
      });
      
      // Send thank you message
      const thankYouMsg = MESSAGES.DONATE_THANK_YOU(amount, total);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: thankYouMsg,
      });

      console.log('Payment processed successfully');
    } catch (error) {
      console.error('Error handling successful payment:', error);
      // Send generic thank you message even if DB save fails
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.DONATE_THANK_YOU(payment.total_amount, payment.total_amount),
      });
    }
  }

  /**
   * Handle route planning request
   */
  private async handleRouteRequest(
    userId: number,
    chatId: number,
    query: string,
    location: Location
  ): Promise<void> {
    try {
      // Check if we have existing results
      const lastResults = await this.sessionManager.getLastResults(userId);
      const userLocation = await this.sessionManager.getValidLocation(userId);
      
      if (lastResults && lastResults.length >= 2) {
        // Extract indices if specified
        const indices = extractPlaceIndices(query);
        
        if (indices.length > 0) {
          // User specified specific places
          console.log(`Building route for specific places: ${indices.join(', ')}`);
          try {
            const routeUrl = buildMultiStopRouteUrl(userLocation, lastResults, indices);
            console.log(`Route URL created successfully: ${routeUrl.substring(0, 100)}...`);
            const messageText = formatRouteMessage(lastResults, indices);
            
            await this.telegramClient.sendMessage({
              chatId,
              text: messageText,
              parseMode: 'Markdown',
              replyMarkup: this.telegramClient.createInlineKeyboard(
                createRouteButton(routeUrl)
              ),
            });
          } catch (error) {
            console.error('Route building error:', error);
            await this.telegramClient.sendMessage({
              chatId,
              text: MESSAGES.ROUTE_ERROR_NOT_ENOUGH,
            });
          }
        } else {
          // User wants route through all places
          console.log(`Building route for all ${lastResults.length} places`);
          // Log places for debugging
          lastResults.forEach((place, idx) => {
            console.log(`  Place ${idx + 1}: ${place.name}`);
            console.log(`    - place_id: ${place.place_id || 'missing'} (length: ${place.place_id?.length || 0})`);
            console.log(`    - has geometry: ${!!place.geometry?.location}`);
          });
          try {
            const routeUrl = buildMultiStopRouteUrl(userLocation, lastResults);
            console.log(`Route URL created successfully: ${routeUrl.substring(0, 100)}...`);
            const messageText = formatRouteMessage(lastResults);
            
            await this.telegramClient.sendMessage({
              chatId,
              text: messageText,
              parseMode: 'Markdown',
              replyMarkup: this.telegramClient.createInlineKeyboard(
                createRouteButton(routeUrl)
              ),
            });
          } catch (error) {
            console.error('Route building error:', error);
            await this.telegramClient.sendMessage({
              chatId,
              text: MESSAGES.ROUTE_ERROR_NOT_ENOUGH,
            });
          }
        }
      } else {
        // No context - perform new multi-place search
        await this.handleMultiPlaceSearch(userId, chatId, query, location);
      }
    } catch (error) {
      console.error('Route request error:', error);
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.ERROR_GENERIC,
      });
    }
  }

  /**
   * Handle multi-place search for route planning
   */
  private async handleMultiPlaceSearch(
    userId: number,
    chatId: number,
    query: string,
    location: Location
  ): Promise<void> {
    try {
      // Get user preferences for context
      const preferences = await this.userManager.getUserPreferences(userId);

      // Get Gemini's response with route planning flag
      let geminiResponse;
      try {
        geminiResponse = await this.geminiClient.search({
          query,
          location,
          userId,
          context: preferences ? { user_preferences: preferences } : undefined,
          isRouteRequest: true,
        });
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          await this.telegramClient.sendMessage({
            chatId,
            text: error.cacheAvailable 
              ? MESSAGES.QUOTA_EXCEEDED_WITH_CACHE 
              : MESSAGES.QUOTA_EXCEEDED_NO_CACHE,
          });
          return;
        }
        throw error;
      }

      // Get full place details for all places
      const placesWithDetails = await Promise.all(
        geminiResponse.places.map(async (place) => {
          let validPlaceId = place.place_id;
          
          const isValidPlaceId = validPlaceId && 
            (validPlaceId.startsWith('ChIJ') || validPlaceId.match(/^[A-Za-z0-9_-]{20,}$/));
          
          if (!isValidPlaceId && place.name) {
            try {
              const resolvedId = await this.geminiClient.resolvePlaceId(
                place.name,
                place.address,
                place.maps_uri
              );
              if (resolvedId) {
                validPlaceId = resolvedId;
              }
            } catch (error) {
              console.error(`Failed to resolve place_id for ${place.name}:`, error);
            }
          }
          
          if (validPlaceId) {
            try {
              const details = await this.geminiClient.getPlaceDetails(validPlaceId, false);
              return { 
                ...place, 
                ...details, 
                place_id: validPlaceId,
                maps_uri: place.maps_uri || details.maps_uri 
              };
            } catch (error) {
              return { ...place, place_id: validPlaceId };
            }
          }
          
          return place;
        })
      );

      // Filter out cities and hotels from multi-place route results
      const validPlaces = placesWithDetails.filter(p => {
        // Must have name
        if (!p.name || p.name === 'Без названия') return false;
        
        // Filter out cities - check if types include locality/political without specific place type
        if (p.types && Array.isArray(p.types)) {
          const hasLocalityType = p.types.includes('locality') || p.types.includes('political');
          const hasSpecificType = p.types.some(t => !['locality', 'political', 'geocode'].includes(t));
          
          // Exclude if it's ONLY a locality/political entity without specific place type
          if (hasLocalityType && !hasSpecificType) {
            console.log(`Filtering out city from multi-place search: "${p.name}" (types: ${p.types.join(', ')})`);
            return false;
          }
          
          // Always filter out hotels/lodging from multi-place route searches
          const isLodging = p.types.some(t => ['lodging', 'hotel'].includes(t));
          if (isLodging) {
            console.log(`Filtering out hotel from multi-place route: "${p.name}" (types: ${p.types.join(', ')})`);
            return false;
          }
        }
        
        // Fallback: Filter by name patterns if types not available (for Gemini Grounding results)
        const nameMatches = /hotel|хотел|hostel|хостел|гостиниц|inn/i.test(p.name);
        if (nameMatches) {
          console.log(`Filtering out hotel by name pattern from route: "${p.name}"`);
          return false;
        }
        
        return true;
      });

      // Filter out places without coordinates (can't build routes without them)
      const placesWithCoordinates = validPlaces.filter(p => {
        if (!p.geometry?.location) {
          console.warn(`⚠️ Excluding "${p.name}" from route results - no coordinates available`);
          return false;
        }
        return true;
      });

      if (placesWithCoordinates.length < 2) {
        await this.telegramClient.sendMessage({
          chatId,
          text: 'Для построения маршрута нужно минимум 2 места с координатами. Попробуй уточнить запрос.',
        });
        return;
      }

      // Save search context
      const searchId = await this.sessionManager.saveSearchContext(
        userId, 
        query, 
        placesWithCoordinates, 
        geminiResponse.text
      );

      // Show all places numbered
      const messageText = formatPlacesMessage(placesWithCoordinates, geminiResponse.text, true);
      const userLocation = await this.sessionManager.getValidLocation(userId);
      
      await this.telegramClient.sendMessage({
        chatId,
        text: messageText,
        parseMode: 'Markdown',
        replyMarkup: this.telegramClient.createInlineKeyboard(
          createMultiPlaceButtons(placesWithCoordinates, userLocation)
        ),
      });

    } catch (error) {
      console.error('Multi-place search error:', error);
      await this.telegramClient.sendMessage({
        chatId,
        text: MESSAGES.ERROR_GENERIC,
      });
    }
  }
}

