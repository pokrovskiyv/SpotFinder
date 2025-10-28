// Shared TypeScript types for SpotFinder Bot

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  successful_payment?: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
    provider_payment_charge_id: string;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message: TelegramMessage;
    data: string;
  };
  pre_checkout_query?: {
    id: string;
    from: TelegramUser;
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
}

// Database types
export interface DBUser {
  user_id: number;
  telegram_username: string | null;
  first_name: string;
  last_name: string | null;
  language_code: string;
  created_at: string;
  last_seen_at: string;
}

export interface DBSession {
  session_id: string;
  user_id: number;
  current_location_lat: number | null;
  current_location_lon: number | null;
  location_timestamp: string | null;
  last_query: string | null;
  last_results: PlaceResult[] | null;
  conversation_state: ConversationState;
  created_at: string;
  updated_at: string;
  places_cache: PlaceResult[] | null;
  cache_query: string | null;
  cache_index: number;
  shown_place_ids: string[] | null;
}

export type ConversationState = 'default' | 'awaiting_location' | 'awaiting_followup';

export interface Location {
  lat: number;
  lon: number;
}

export interface PlaceResult {
  place_id?: string; // Optional - undefined means use coordinates instead
  name: string;
  address?: string;
  rating?: number;
  price_level?: number;
  distance?: number;
  is_open?: boolean;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  reviews?: PlaceReview[];
  photos?: PlacePhoto[];
  maps_uri?: string; // Google Maps URI from Grounding for fallback navigation
  types?: string[]; // Google Places types (e.g., ['restaurant', 'food'], ['locality', 'political'])
  phone_number?: string; // formatted_phone_number from API
  website?: string; // website from API
  editorial_summary?: string; // editorial_summary.overview from API
}

export interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  translated_text?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

export interface DBUserPreferences {
  preference_id: string;
  user_id: number;
  home_address: string | null;
  home_location: string | null; // PostGIS GEOMETRY
  work_address: string | null;
  work_location: string | null;
  preferred_transport_mode: 'walking' | 'driving' | 'public';
  dietary_restrictions: string[] | null;
  profile_notes: string | null;
  updated_at: string;
}

export interface DBSearchHistory {
  search_id: string;
  user_id: number;
  timestamp: string;
  query_text: string;
  location_lat: number;
  location_lon: number;
  gemini_response_text: string | null;
  returned_place_ids: string[] | null;
  results_count: number;
  top_result: PlaceResult | null;
  selected_place_id: string | null;
  user_rating: number | null;
}

export interface DBDonation {
  donation_id: string;
  user_id: number;
  amount_stars: number;
  telegram_payment_charge_id: string;
  status: 'completed' | 'pending' | 'refunded';
  created_at: string;
}

export interface DBPlaceCache {
  place_id: string;
  name: string;
  address: string | null;
  location: string | null; // PostGIS GEOMETRY
  google_data_jsonb: PlaceResult | null;
  last_fetched_at: string;
  cache_expires_at: string;
}

export interface SearchFilters {
  minRating?: number;
  maxPriceLevel?: number;
  sortBy?: 'rating' | 'price' | 'distance';
  openNow?: boolean;
}

export interface DBUserAction {
  action_id: string;
  user_id: number;
  action_type: 'view_reviews' | 'view_route' | 'click_maps' | 'select_place' | 'donation';
  place_id: string | null;
  search_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface DBApiCostMetric {
  metric_id: string;
  user_id: number;
  api_provider: 'gemini' | 'google_maps';
  api_type: string;
  tokens_estimated: number;
  cost_usd: number;
  from_cache: boolean;
  quota_exceeded: boolean;
  timestamp: string;
  date: string;
}

export interface QuotaStatus {
  canProceed: boolean;
  globalLimitReached: boolean;
  userLimitReached: boolean;
  remainingCalls?: number;
}

export class QuotaExceededError extends Error {
  constructor(public quotaType: 'global' | 'user', public cacheAvailable: boolean) {
    super('API quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

export interface GeminiRequest {
  query: string;
  location: Location;
  userId?: number; // For cost tracking and quota management
  context?: {
    last_query?: string;
    last_results?: PlaceResult[];
    user_preferences?: Partial<DBUserPreferences>;
  };
  isRouteRequest?: boolean; // Flag for route planning requests
  filters?: SearchFilters; // Filters extracted from user query
  excludePlaceIds?: string[]; // Place IDs to exclude from search results
}

export interface GeminiResponse {
  text: string;
  places: PlaceResult[];
  intent?: string;
  groundingMetadata?: GroundingMetadata;
  extractedCity?: string | null; // City extracted by Gemini from query
}

// Google Maps Grounding types
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  googleMapsWidgetContextToken?: string;
}

export interface GroundingChunk {
  maps?: {
    title: string;
    uri: string;
    placeId?: string;
    address?: string;
  };
  confidenceScore?: number;
}

// Environment variables
export interface Environment {
  TELEGRAM_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Contextual dialog types
export type QuestionType = 'detail' | 'comparison' | 'general';

export interface ContextualQuestion {
  type: QuestionType;
  query: string;
  targetPlaceIndices?: number[]; // Номера мест из последних результатов
}

