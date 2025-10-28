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
}

export type ConversationState = 'default' | 'awaiting_location' | 'awaiting_followup';

export interface Location {
  lat: number;
  lon: number;
}

export interface PlaceResult {
  place_id: string;
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

export interface GeminiRequest {
  query: string;
  location: Location;
  context?: {
    last_query?: string;
    last_results?: PlaceResult[];
    user_preferences?: Partial<DBUserPreferences>;
  };
}

export interface GeminiResponse {
  text: string;
  places: PlaceResult[];
  intent?: string;
  groundingMetadata?: GroundingMetadata;
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

