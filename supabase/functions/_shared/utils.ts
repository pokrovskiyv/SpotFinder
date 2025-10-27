// Shared utility functions for SpotFinder Bot

import { Location } from './types.ts';
import { LOCATION_TTL_MINUTES } from './constants.ts';

/**
 * Check if location is still valid (not expired)
 */
export function isLocationValid(locationTimestamp: string | null): boolean {
  if (!locationTimestamp) return false;
  
  const timestamp = new Date(locationTimestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
  
  return diffMinutes <= LOCATION_TTL_MINUTES;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lon - point1.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

/**
 * Extract ordinal number from text (e.g., "второй" -> 2, "первая" -> 1)
 */
export function extractOrdinal(text: string): number | null {
  const ordinals: Record<string, number> = {
    'перв': 1,
    'втор': 2,
    'трет': 3,
    'четверт': 4,
    'пят': 5,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  };

  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(ordinals)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Check if message is a follow-up question
 */
export function isFollowUpQuestion(text: string): boolean {
  const followUpPatterns = [
    /\bу\s+(него|нее|них|первого|второго|третьего)\b/i,
    /\b(первый|второй|третий|четвертый|пятый)\b/i,
    /\b(этот|тот|там)\b/i,
    /\b(туда|сюда)\b/i,
  ];

  return followUpPatterns.some(pattern => pattern.test(text));
}

/**
 * Generate geo-hash for caching (simple implementation)
 * Rounds coordinates to 3 decimal places (~100m precision)
 */
export function generateGeoHash(location: Location): string {
  const lat = location.lat.toFixed(3);
  const lon = location.lon.toFixed(3);
  return `${lat},${lon}`;
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse JSON safely
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current time of day context
 */
export function getTimeContext(): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'утро';
  if (hour >= 12 && hour < 18) return 'день';
  if (hour >= 18 && hour < 23) return 'вечер';
  return 'ночь';
}

/**
 * Validate environment variables
 */
export function validateEnv(env: Record<string, string | undefined>, required: string[]): void {
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

