// Unit tests for telegram-formatter.ts

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  formatPlacesMessage,
  createPlaceButtons,
  createPlacesListButtons,
  formatPlaceDetails,
  formatErrorMessage,
  formatWelcomeMessage
} from './telegram-formatter.ts';
import { TestDataFactory } from './test-utils.ts';

Deno.test('formatPlacesMessage - empty places', () => {
  const result = formatPlacesMessage([]);
  
  assertEquals(result, '😞 К сожалению, ничего не нашел рядом. Попробуй изменить запрос.');
});

Deno.test('formatPlacesMessage - single place', () => {
  const places = [TestDataFactory.createPlaceResult({
    name: 'Test Restaurant',
    rating: 4.5,
    price_level: 2,
    distance: 500,
    is_open: true,
    address: 'Test Address, 123'
  })];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('🔍 Вот что я нашел:'), true);
  assertEquals(result.includes('1. **Test Restaurant**'), true);
  assertEquals(result.includes('⭐ 4.5'), true);
  assertEquals(result.includes('💰💰'), true);
  assertEquals(result.includes('500 м'), true);
  assertEquals(result.includes('✅ Открыто'), true);
  assertEquals(result.includes('📍 Test Address, 123'), true);
});

Deno.test('formatPlacesMessage - multiple places', () => {
  const places = TestDataFactory.createPlaceResults(3);
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('1. **Place 1**'), true);
  assertEquals(result.includes('2. **Place 2**'), true);
  assertEquals(result.includes('3. **Place 3**'), true);
});

Deno.test('formatPlacesMessage - with intro text', () => {
  const places = [TestDataFactory.createPlaceResult()];
  const introText = 'Нашел рестораны:';
  
  const result = formatPlacesMessage(places, introText);
  
  assertEquals(result.includes('Нашел рестораны:'), true);
  assertEquals(result.includes('🔍 Вот что я нашел:'), false);
});

Deno.test('formatPlacesMessage - place without optional fields', () => {
  const places = [TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No rating, price_level, distance, is_open, address
  })];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('1. **Test Place**'), true);
  assertEquals(result.includes('⭐'), false);
  assertEquals(result.includes('💰'), false);
  assertEquals(result.includes('м'), false);
  assertEquals(result.includes('✅'), false);
  assertEquals(result.includes('📍'), false);
});

Deno.test('formatPlacesMessage - closed place', () => {
  const places = [TestDataFactory.createPlaceResult({
    name: 'Test Place',
    is_open: false
  })];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('❌ Закрыто'), true);
});

Deno.test('createPlaceButtons - basic functionality', () => {
  const place = TestDataFactory.createPlaceResult({
    place_id: 'test_place_id',
    name: 'Test Place'
  });
  
  const buttons = createPlaceButtons(place, 0);
  
  assertEquals(buttons.length, 2); // Two rows
  
  // First row should have map and directions buttons
  assertEquals(buttons[0].length, 2);
  assertEquals(buttons[0][0].text, '🗺 Показать на карте');
  assertEquals(buttons[0][1].text, '🚶 Как добраться');
  
  // Second row should have more info button
  assertEquals(buttons[1].length, 1);
  assertEquals(buttons[1][0].text, 'ℹ️ Подробнее');
  assertEquals(buttons[1][0].callback_data, 'info_0_test_place_id');
});

Deno.test('createPlaceButtons - place without place_id', () => {
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No place_id
  });
  
  const buttons = createPlaceButtons(place, 1);
  
  assertEquals(buttons.length, 1); // Only more info row
  assertEquals(buttons[0][0].text, 'ℹ️ Подробнее');
});

Deno.test('createPlaceButtons - correct index', () => {
  const place = TestDataFactory.createPlaceResult({
    place_id: 'test_place_id'
  });
  
  const buttons = createPlaceButtons(place, 2);
  
  assertEquals(buttons[1][0].callback_data, 'info_2_test_place_id');
});

Deno.test('createPlacesListButtons - multiple places', () => {
  const places = TestDataFactory.createPlaceResults(3);
  
  const buttons = createPlacesListButtons(places);
  
  assertEquals(buttons.length, 3);
  assertEquals(buttons[0][0].text, '1. Place 1');
  assertEquals(buttons[1][0].text, '2. Place 2');
  assertEquals(buttons[2][0].text, '3. Place 3');
});

Deno.test('createPlacesListButtons - max 5 places', () => {
  const places = TestDataFactory.createPlaceResults(7);
  
  const buttons = createPlacesListButtons(places);
  
  assertEquals(buttons.length, 5); // Should be limited to 5
});

Deno.test('createPlacesListButtons - callback data format', () => {
  const places = TestDataFactory.createPlaceResults(2);
  
  const buttons = createPlacesListButtons(places);
  
  assertEquals(buttons[0][0].callback_data, 'select_0_place_1');
  assertEquals(buttons[1][0].callback_data, 'select_1_place_2');
});

Deno.test('createPlacesListButtons - long place names truncated', () => {
  const places = [TestDataFactory.createPlaceResult({
    name: 'This is a very long place name that should be truncated'
  })];
  
  const buttons = createPlacesListButtons(places);
  
  assertEquals(buttons[0][0].text.length <= 33, true); // "1. " + truncated name
});

Deno.test('formatPlaceDetails - complete place', () => {
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Restaurant',
    address: 'Test Address, 123',
    rating: 4.5,
    price_level: 2,
    distance: 500,
    is_open: true
  });
  
  const result = formatPlaceDetails(place);
  
  assertEquals(result.includes('📍 **Test Restaurant**'), true);
  assertEquals(result.includes('🏠 Адрес: Test Address, 123'), true);
  assertEquals(result.includes('⭐ Рейтинг: 4.5/5'), true);
  assertEquals(result.includes('💰 Цены: 💰💰'), true);
  assertEquals(result.includes('📏 Расстояние: 500 м'), true);
  assertEquals(result.includes('✅ Открыто сейчас'), true);
});

Deno.test('formatPlaceDetails - minimal place', () => {
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place'
    // No other fields
  });
  
  const result = formatPlaceDetails(place);
  
  assertEquals(result.includes('📍 **Test Place**'), true);
  assertEquals(result.includes('🏠'), false);
  assertEquals(result.includes('⭐'), false);
  assertEquals(result.includes('💰'), false);
  assertEquals(result.includes('📏'), false);
  assertEquals(result.includes('✅'), false);
});

Deno.test('formatPlaceDetails - closed place', () => {
  const place = TestDataFactory.createPlaceResult({
    name: 'Test Place',
    is_open: false
  });
  
  const result = formatPlaceDetails(place);
  
  assertEquals(result.includes('❌ Закрыто'), true);
});

Deno.test('formatErrorMessage - basic error', () => {
  const error = 'Something went wrong';
  
  const result = formatErrorMessage(error);
  
  assertEquals(result.includes('😕 Something went wrong'), true);
  assertEquals(result.includes('Попробуй:'), true);
  assertEquals(result.includes('Изменить запрос'), true);
  assertEquals(result.includes('Уточнить'), true);
  assertEquals(result.includes('/help'), true);
});

Deno.test('formatWelcomeMessage - with name', () => {
  const firstName = 'Александр';
  
  const result = formatWelcomeMessage(firstName);
  
  assertEquals(result.includes('👋 Привет, Александр!'), true);
  assertEquals(result.includes('SpotFinder'), true);
  assertEquals(result.includes('AI-ассистент'), true);
  assertEquals(result.includes('Примеры запросов:'), true);
  assertEquals(result.includes('Найди тихое кафе'), true);
  assertEquals(result.includes('Где ближайшая аптека'), true);
  assertEquals(result.includes('Хочу недорого поесть'), true);
  assertEquals(result.includes('поделись своей геолокацией'), true);
});

Deno.test('formatWelcomeMessage - empty name', () => {
  const result = formatWelcomeMessage('');
  
  assertEquals(result.includes('👋 Привет, !'), true);
});

Deno.test('formatPlacesMessage - price level symbols', () => {
  const places = [
    TestDataFactory.createPlaceResult({ name: 'Place 1', price_level: 1 }),
    TestDataFactory.createPlaceResult({ name: 'Place 2', price_level: 2 }),
    TestDataFactory.createPlaceResult({ name: 'Place 3', price_level: 3 }),
    TestDataFactory.createPlaceResult({ name: 'Place 4', price_level: 4 }),
    TestDataFactory.createPlaceResult({ name: 'Place 5', price_level: 5 })
  ];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('💰'), true); // Level 1
  assertEquals(result.includes('💰💰'), true); // Level 2
  assertEquals(result.includes('💰💰💰'), true); // Level 3
  assertEquals(result.includes('💰💰💰💰'), true); // Level 4
  assertEquals(result.includes('💰💰💰💰'), true); // Level 5 (capped at 4)
});

Deno.test('formatPlacesMessage - distance formatting', () => {
  const places = [
    TestDataFactory.createPlaceResult({ name: 'Place 1', distance: 500 }),
    TestDataFactory.createPlaceResult({ name: 'Place 2', distance: 1500 }),
    TestDataFactory.createPlaceResult({ name: 'Place 3', distance: 2500 })
  ];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('500 м'), true);
  assertEquals(result.includes('1.5 км'), true);
  assertEquals(result.includes('2.5 км'), true);
});

Deno.test('formatPlacesMessage - rating formatting', () => {
  const places = [
    TestDataFactory.createPlaceResult({ name: 'Place 1', rating: 4.0 }),
    TestDataFactory.createPlaceResult({ name: 'Place 2', rating: 4.25 }),
    TestDataFactory.createPlaceResult({ name: 'Place 3', rating: 4.567 })
  ];
  
  const result = formatPlacesMessage(places);
  
  assertEquals(result.includes('⭐ 4.0'), true);
  assertEquals(result.includes('⭐ 4.3'), true);
  assertEquals(result.includes('⭐ 4.6'), true);
});
