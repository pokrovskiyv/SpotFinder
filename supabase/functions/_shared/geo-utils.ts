// Geographic utilities for distance calculations and filtering

import { Location, PlaceResult } from './types.ts';
import { MAX_SEARCH_RADIUS } from './constants.ts';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371000; // Earth radius in meters
  const lat1Rad = point1.lat * (Math.PI / 180);
  const lat2Rad = point2.lat * (Math.PI / 180);
  const deltaLatRad = (point2.lat - point1.lat) * (Math.PI / 180);
  const deltaLonRad = (point2.lon - point1.lon) * (Math.PI / 180);

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * Filter places by distance from user location
 */
export function filterByDistance(
  places: PlaceResult[],
  userLocation: Location,
  maxRadius: number = MAX_SEARCH_RADIUS
): PlaceResult[] {
  return places.filter(place => {
    // Use pre-calculated distance if available
    if (place.distance !== undefined && place.distance <= maxRadius) {
      return true;
    }
    
    // If distance not calculated yet, calculate it from geometry
    if (place.geometry?.location) {
      const distance = calculateDistance(userLocation, {
        lat: place.geometry.location.lat,
        lon: place.geometry.location.lng,
      });
      
      return distance <= maxRadius;
    }
    
    // If no geometry or distance, exclude it (shouldn't happen)
    return false;
  });
}

/**
 * Sort places by distance from user location
 */
export function sortByDistance(
  places: PlaceResult[],
  userLocation: Location
): PlaceResult[] {
  return places.sort((a, b) => {
    const distanceA = a.distance || 0;
    const distanceB = b.distance || 0;
    
    return distanceA - distanceB;
  });
}

/**
 * Deduplicate places by place_id, keeping the one with smaller distance
 */
export function deduplicatePlaces(places: PlaceResult[]): PlaceResult[] {
  const seen = new Map<string, PlaceResult>();
  
  for (const place of places) {
    const existing = seen.get(place.place_id);
    
    // Keep the one with smaller distance or first occurrence
    if (!existing || (place.distance && existing.distance && place.distance < existing.distance)) {
      seen.set(place.place_id, place);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Combine filtering and sorting
 */
export function filterAndSort(
  places: PlaceResult[],
  userLocation: Location,
  maxRadius: number = MAX_SEARCH_RADIUS
): PlaceResult[] {
  const filtered = filterByDistance(places, userLocation, maxRadius);
  return sortByDistance(filtered, userLocation);
}

