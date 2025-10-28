// Intent Mapper - preprocesses user queries to map implicit intents to explicit search queries

export interface IntentPattern {
  patterns: RegExp[];
  intent: string;
  suggestedQuery: string;
  category: string;
  excludeTypes?: string[]; // Types of places to explicitly exclude
  priority: number; // Higher priority patterns are checked first
}

export interface MappedIntent {
  originalQuery: string;
  suggestedQuery: string;
  intent: string;
  category: string;
  excludeTypes?: string[];
  matched: boolean;
  matchedPattern?: string;
}

/**
 * Predefined intent patterns mapping problems to solutions
 * Ordered by priority (higher priority first)
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // Physical problems - Footwear
  {
    patterns: [
      /промо[кч](?:ил|ла|ли)?\s+(?:ноги|ног|обувь)/i,
      /вымок(?:ла|ли)?\s+обувь/i,
      /промок(?:ла|ли)?\s+под\s+дожд/i,
      /мокр(?:ая|ые)\s+(?:ноги|ног|обувь)/i,
      /нужна?\s+(?:новая|сухая)\s+обувь/i,
      /купить\s+обувь\s+срочно/i,
    ],
    intent: 'need_footwear',
    suggestedQuery: 'обувные магазины поблизости, открыто сейчас',
    category: 'shopping',
    excludeTypes: ['lodging', 'hotel', 'hostel'],
    priority: 100,
  },
  
  // Health issues - Pharmacy
  {
    patterns: [
      /заболел(?:а|и)?/i,
      /плохо\s+(?:себя\s+)?чувствую/i,
      /(?:болит|заболел(?:а|о)?)\s+(?:голова|горло|живот|зуб)/i,
      /нужн(?:о|а|ы)\s+(?:лекарств|таблетк|медикамент)/i,
      /(?:срочно\s+)?(?:нужна|ищу)\s+аптек/i,
      /температура/i,
    ],
    intent: 'need_pharmacy',
    suggestedQuery: 'аптеки рядом, работающие сейчас',
    category: 'health',
    excludeTypes: ['lodging', 'hotel', 'restaurant'],
    priority: 95,
  },
  
  // Technical issues - Phone charging
  {
    patterns: [
      /(?:сел|разряди(?:лся|лась)|сядет)\s+(?:телефон|батарея|аккумулятор)/i,
      /нет\s+(?:зарядки|зарядка)/i,
      /(?:нужна|ищу)\s+розетк/i,
      /(?:где\s+)?(?:можно\s+)?зарядить\s+телефон/i,
      /(?:нужно|надо)\s+подзарядить/i,
    ],
    intent: 'need_charging',
    suggestedQuery: 'кафе с розетками и Wi-Fi, торговые центры рядом',
    category: 'services',
    excludeTypes: ['lodging', 'hotel'],
    priority: 90,
  },
  
  // Hunger - Food
  {
    patterns: [
      /(?:очень\s+)?голодн(?:ый|ая|ые)/i,
      /(?:есть|кушать)\s+хоч(?:у|ется)/i,
      /умираю\s+(?:с|от)\s+голод/i,
      /срочно\s+(?:поесть|покушать|перекусить)/i,
      /нужно\s+(?:что-то\s+)?(?:поесть|съесть)/i,
    ],
    intent: 'need_food',
    suggestedQuery: 'кафе и рестораны поблизости, открыто сейчас, быстрое обслуживание',
    category: 'food',
    excludeTypes: ['lodging', 'hotel'],
    priority: 85,
  },
  
  // Urgent needs - Restroom
  {
    patterns: [
      /(?:нужен|ищу|где)\s+туалет/i,
      /(?:в\s+)?туалет\s+(?:срочно|очень\s+нужен)/i,
      /(?:где\s+)?(?:можно\s+)?(?:в\s+)?уборн/i,
      /(?:где\s+)?(?:общественный|публичный)\s+туалет/i,
    ],
    intent: 'need_restroom',
    suggestedQuery: 'торговые центры, кафе с туалетами, общественные туалеты рядом',
    category: 'facilities',
    excludeTypes: ['lodging', 'hotel'],
    priority: 100,
  },
  
  // Financial - ATM/Bank
  {
    patterns: [
      /(?:нужны|нужно\s+снять)\s+деньги/i,
      /(?:где\s+)?(?:ближайший\s+)?банкомат/i,
      /(?:снять|получить)\s+(?:наличные|налич|кэш)/i,
      /нужен\s+(?:банк|атм|atm)/i,
      /(?:где\s+)?(?:можно\s+)?снять\s+деньги/i,
    ],
    intent: 'need_cash',
    suggestedQuery: 'банкоматы и банки поблизости, работающие сейчас',
    category: 'finance',
    excludeTypes: ['lodging', 'hotel', 'restaurant'],
    priority: 90,
  },
  
  // Lost items - Locksmith
  {
    patterns: [
      /потерял(?:а|и)?\s+ключи/i,
      /(?:где\s+)?сделать\s+ключи/i,
      /(?:нужна|ищу)\s+(?:мастерская|мастерск)\s+(?:по\s+)?ключ/i,
      /(?:дубликат|копия)\s+ключ/i,
    ],
    intent: 'need_locksmith',
    suggestedQuery: 'мастерские по изготовлению ключей, услуги ключника',
    category: 'services',
    excludeTypes: ['lodging', 'hotel'],
    priority: 85,
  },
  
  // Work needs - Coworking/Cafe with WiFi
  {
    patterns: [
      /(?:нужно|хочу|надо)\s+поработать/i,
      /(?:где\s+)?(?:можно\s+)?(?:поработать|с\s+ноутбуком)/i,
      /(?:ищу\s+)?(?:коворкинг|coworking)/i,
      /(?:кафе|место)\s+(?:с\s+)?(?:wifi|вайфай|wi-fi|интернет)/i,
      /(?:тихое\s+)?место\s+(?:для\s+)?работ/i,
    ],
    intent: 'need_workspace',
    suggestedQuery: 'кафе с Wi-Fi и розетками, коворкинги, тихие места для работы',
    category: 'workspace',
    excludeTypes: ['lodging', 'hotel'],
    priority: 80,
  },
  
  // Reading - Library/Quiet cafe
  {
    patterns: [
      /(?:хочу|нужно)\s+(?:по)?читать/i,
      /(?:где\s+)?(?:можно\s+)?почитать\s+книг/i,
      /(?:ищу\s+)?(?:библиотек|читальн)/i,
      /(?:тихое\s+)?место\s+(?:для\s+)?чтения/i,
    ],
    intent: 'need_reading_space',
    suggestedQuery: 'библиотеки, тихие кафе для чтения',
    category: 'leisure',
    excludeTypes: ['lodging', 'hotel'],
    priority: 75,
  },
  
  // With children - Family-friendly places
  {
    patterns: [
      /(?:с\s+)?(?:детьми|ребенком|ребёнком)/i,
      /(?:для\s+)?(?:детей|ребенка|ребёнка)/i,
      /(?:детская|детское)\s+(?:площадк|кафе|место)/i,
      /family\s+friendly/i,
    ],
    intent: 'with_children',
    suggestedQuery: 'детские площадки, семейные кафе, развлечения для детей',
    category: 'family',
    excludeTypes: ['bar', 'night_club', 'lodging'],
    priority: 85,
  },
];

/**
 * IntentMapper class - handles query preprocessing
 */
export class IntentMapper {
  private patterns: IntentPattern[];
  
  constructor(customPatterns?: IntentPattern[]) {
    // Sort patterns by priority (highest first)
    this.patterns = [...INTENT_PATTERNS, ...(customPatterns || [])]
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Map user query to explicit intent
   * Returns mapped intent if pattern matches, null otherwise
   */
  mapQuery(query: string): MappedIntent | null {
    const normalizedQuery = query.trim();
    
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(normalizedQuery)) {
          console.log(`IntentMapper: Matched pattern "${pattern.intent}" for query: "${query}"`);
          console.log(`IntentMapper: Suggested query: "${pattern.suggestedQuery}"`);
          
          return {
            originalQuery: query,
            suggestedQuery: pattern.suggestedQuery,
            intent: pattern.intent,
            category: pattern.category,
            excludeTypes: pattern.excludeTypes,
            matched: true,
            matchedPattern: pattern.intent,
          };
        }
      }
    }
    
    console.log(`IntentMapper: No pattern matched for query: "${query}"`);
    return null;
  }
  
  /**
   * Get all available intent patterns (for debugging/documentation)
   */
  getPatterns(): IntentPattern[] {
    return this.patterns;
  }
  
  /**
   * Add custom pattern at runtime
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
    // Re-sort by priority
    this.patterns.sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
export const intentMapper = new IntentMapper();

