// Places Sorter - smart sorting and filtering of places based on user preferences

import { PlaceResult, SearchFilters, Location } from './types.ts';

/**
 * Sort and filter places based on user-defined filters
 * Default sorting: rating + price + distance (if no specific sort requested)
 */
export function sortAndFilterPlaces(
  places: PlaceResult[],
  filters: SearchFilters,
  userLocation: Location
): PlaceResult[] {
  let filtered = [...places];

  // Apply filters
  if (filters.minRating !== undefined) {
    filtered = filtered.filter(p => (p.rating || 0) >= filters.minRating!);
  }

  if (filters.maxPriceLevel !== undefined) {
    filtered = filtered.filter(p => 
      p.price_level === undefined || p.price_level <= filters.maxPriceLevel!
    );
  }

  if (filters.openNow) {
    filtered = filtered.filter(p => p.is_open === true);
  }

  // Sort based on sortBy or use default complex sorting
  return filtered.sort((a, b) => {
    const sortBy = filters.sortBy;

    switch (sortBy) {
      case 'rating':
        // Sort by rating (highest first)
        return (b.rating || 0) - (a.rating || 0);

      case 'price':
        // Sort by price (lowest first)
        return (a.price_level || 0) - (b.price_level || 0);

      case 'distance':
        // Sort by distance (nearest first)
        return (a.distance || Infinity) - (b.distance || Infinity);

      default:
        // Complex default sorting: rating + price + distance
        // Weights: rating is most important, then price (lower is better), then distance
        const ratingScore = ((b.rating || 0) - (a.rating || 0)) * 10;
        const priceScore = ((a.price_level || 2) - (b.price_level || 2)) * 5;
        const distanceScore = ((a.distance || 5000) - (b.distance || 5000)) / 100;
        
        return ratingScore + priceScore + distanceScore;
    }
  });
}

