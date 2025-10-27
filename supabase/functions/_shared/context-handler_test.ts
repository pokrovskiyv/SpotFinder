// Unit tests for context-handler.ts

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { ContextHandler } from './context-handler.ts';
import { TestDataFactory } from './test-utils.ts';

Deno.test('ContextHandler - formatPlaceAnswer parking question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Restaurant',
    address: 'Test Address'
  });
  
  const result = handler.formatPlaceAnswer(place, 'у него есть парковка?');
  
  assertEquals(result.includes('🚗'), true);
  assertEquals(result.includes('Test Restaurant'), true);
  assertEquals(result.includes('парковк'), true);
});

Deno.test('ContextHandler - formatPlaceAnswer hours question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Cafe',
    is_open: true
  });
  
  const result = handler.formatPlaceAnswer(place, 'какие часы работы?');
  
  assertEquals(result.includes('⏰'), true);
  assertEquals(result.includes('Test Cafe'), true);
  assertEquals(result.includes('Открыто сейчас'), true);
});

Deno.test('ContextHandler - formatPlaceAnswer price question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    price_level: 3
  });
  
  const result = handler.formatPlaceAnswer(place, 'сколько стоит?');
  
  assertEquals(result.includes('💰'), true);
  assertEquals(result.includes('Test Place'), true);
  assertEquals(result.includes('Средние цены'), true);
});

Deno.test('ContextHandler - formatPlaceAnswer rating question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    rating: 4.7
  });
  
  const result = handler.formatPlaceAnswer(place, 'какой рейтинг?');
  
  assertEquals(result.includes('⭐'), true);
  assertEquals(result.includes('Test Place'), true);
  assertEquals(result.includes('4.7'), true);
  assertEquals(result.includes('Отличный рейтинг'), true);
});

Deno.test('ContextHandler - formatPlaceAnswer address question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    address: 'Test Address, 123'
  });
  
  const result = handler.formatPlaceAnswer(place, 'где находится?');
  
  assertEquals(result.includes('📍'), true);
  assertEquals(result.includes('Test Place'), true);
  assertEquals(result.includes('Test Address, 123'), true);
});

Deno.test('ContextHandler - formatPlaceAnswer unknown question', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
  });
  
  const result = handler.formatPlaceAnswer(place, 'что-то непонятное');
  
  // Should return full details (calls formatPlaceDetails)
  assertEquals(result.includes('Test Place'), true);
});

Deno.test('ContextHandler - formatDetailedInfo complete place', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Restaurant',
    address: 'Test Address, 123',
    rating: 4.5,
    price_level: 2,
    is_open: true
  });
  
  const result = handler.formatDetailedInfo(place);
  
  assertEquals(result.includes('Test Restaurant'), true);
  assertEquals(result.includes('Test Address, 123'), true);
  assertEquals(result.includes('4.5'), true);
  assertEquals(result.includes('Недорого'), true);
  assertEquals(result.includes('Открыто сейчас'), true);
});

Deno.test('ContextHandler - formatDetailedInfo minimal place', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No other fields
  });
  
  const result = handler.formatDetailedInfo(place);
  
  assertEquals(result.includes('Test Place'), true);
  assertEquals(result.includes('📍'), true);
});

Deno.test('ContextHandler - formatDetailedInfo closed place', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    is_open: false
  });
  
  const result = handler.formatDetailedInfo(place);
  
  assertEquals(result.includes('Закрыто'), true);
});

Deno.test('ContextHandler - needsContext with pronouns', () => {
  const handler = new ContextHandler();
  
  assertEquals(handler.needsContext('он хороший?'), true);
  assertEquals(handler.needsContext('она открыта?'), true);
  assertEquals(handler.needsContext('оно работает?'), true);
  assertEquals(handler.needsContext('там есть?'), true);
  assertEquals(handler.needsContext('туда идти?'), true);
  assertEquals(handler.needsContext('сюда прийти?'), true);
  assertEquals(handler.needsContext('этот ресторан'), true);
  assertEquals(handler.needsContext('тот кафе'), true);
});

Deno.test('ContextHandler - needsContext with ordinals', () => {
  const handler = new ContextHandler();
  
  assertEquals(handler.needsContext('первый далеко?'), true);
  assertEquals(handler.needsContext('второй дорогой?'), true);
  assertEquals(handler.needsContext('третий открыт?'), true);
  assertEquals(handler.needsContext('четвертый хороший?'), true);
  assertEquals(handler.needsContext('пятый подходит?'), true);
});

Deno.test('ContextHandler - needsContext with possessive', () => {
  const handler = new ContextHandler();
  
  assertEquals(handler.needsContext('у него парковка?'), true);
  assertEquals(handler.needsContext('у нее рейтинг?'), true);
  assertEquals(handler.needsContext('у них цены?'), true);
});

Deno.test('ContextHandler - needsContext without context', () => {
  const handler = new ContextHandler();
  
  assertEquals(handler.needsContext('найди кафе'), false);
  assertEquals(handler.needsContext('где аптека?'), false);
  assertEquals(handler.needsContext('хочу поесть'), false);
  assertEquals(handler.needsContext(''), false);
});

Deno.test('ContextHandler - case insensitive context detection', () => {
  const handler = new ContextHandler();
  
  assertEquals(handler.needsContext('ОН хороший?'), true);
  assertEquals(handler.needsContext('Первый далеко?'), true);
  assertEquals(handler.needsContext('У НЕГО парковка?'), true);
});

Deno.test('ContextHandler - rating info high rating', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    rating: 4.8
  });
  
  const result = handler.formatPlaceAnswer(place, 'какой рейтинг?');
  
  assertEquals(result.includes('Отличный рейтинг'), true);
  assertEquals(result.includes('🌟'), true);
});

Deno.test('ContextHandler - rating info medium rating', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    rating: 3.5
  });
  
  const result = handler.formatPlaceAnswer(place, 'какой рейтинг?');
  
  assertEquals(result.includes('Средний рейтинг'), true);
  assertEquals(result.includes('🤔'), true);
});

Deno.test('ContextHandler - rating info low rating', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    rating: 2.1
  });
  
  const result = handler.formatPlaceAnswer(place, 'какой рейтинг?');
  
  assertEquals(result.includes('Низкий рейтинг'), true);
  assertEquals(result.includes('⚠️'), true);
});

Deno.test('ContextHandler - rating info no rating', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No rating
  });
  
  const result = handler.formatPlaceAnswer(place, 'какой рейтинг?');
  
  assertEquals(result.includes('Рейтинг не найден'), true);
});

Deno.test('ContextHandler - price info all levels', () => {
  const handler = new ContextHandler();
  
  const levels = [
    { level: 1, expected: 'Очень бюджетно' },
    { level: 2, expected: 'Недорого' },
    { level: 3, expected: 'Средние цены' },
    { level: 4, expected: 'Выше среднего' },
    { level: 5, expected: 'Дорого' }
  ];
  
  levels.forEach(({ level, expected }) => {
    const place = TestDataFactory.createPlaceResult({
      name: 'Test Place',
      price_level: level
    });
    
    const result = handler.formatPlaceAnswer(place, 'сколько стоит?');
    assertEquals(result.includes(expected), true);
  });
});

Deno.test('ContextHandler - price info no price level', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No price_level
  });
  
  const result = handler.formatPlaceAnswer(place, 'сколько стоит?');
  
  assertEquals(result.includes('Информация о ценах не найдена'), true);
});

Deno.test('ContextHandler - opening hours open', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    is_open: true
  });
  
  const result = handler.formatPlaceAnswer(place, 'открыто?');
  
  assertEquals(result.includes('Открыто сейчас'), true);
  assertEquals(result.includes('✅'), true);
});

Deno.test('ContextHandler - opening hours closed', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    is_open: false
  });
  
  const result = handler.formatPlaceAnswer(place, 'открыто?');
  
  assertEquals(result.includes('Закрыто'), true);
  assertEquals(result.includes('❌'), true);
});

Deno.test('ContextHandler - opening hours unknown', () => {
  const handler = new ContextHandler();
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No is_open field
  });
  
  const result = handler.formatPlaceAnswer(place, 'открыто?');
  
  assertEquals(result.includes('Информация о часах работы не найдена'), true);
});
