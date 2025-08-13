import * as localStorageService from './localStorageService';
import { ItemCore } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Типы AI провайдеров
export type AIProvider = 'claude' | 'openai' | 'gemini' | 'local';

// Интерфейсы для разных AI провайдеров
interface ClaudeAPI {
  messages: {
    create: (params: any) => Promise<any>;
  };
}

interface OpenAIAPI {
  chat: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
}

interface GeminiAPI {
  generateContent: (prompt: string) => Promise<any>;
}

// Состояние SMARTIE
let currentProvider: AIProvider = 'claude';
let claudeAPI: ClaudeAPI | null = null;
let openaiAPI: OpenAIAPI | null = null;
let geminiAPI: GeminiAPI | null = null;
let localLlmUrl: string = '';

// Инициализация провайдеров
export const initializeClaudeAPI = async (apiKey: string) => {
  try {
    // Динамический импорт для уменьшения размера bundle в demo версии
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    claudeAPI = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    currentProvider = 'claude';
    return true;
  } catch (error) {
    console.error('Failed to initialize Claude API:', error);
    return false;
  }
};

export const initializeOpenAI = async (apiKey: string) => {
  try {
    // Динамический импорт OpenAI
    const { default: OpenAI } = await import('openai');
    openaiAPI = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    currentProvider = 'openai';
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI API:', error);
    return false;
  }
};

export const initializeGemini = async (apiKey: string) => {
  try {
    // Динамический импорт Google Gemini
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    geminiAPI = model;
    currentProvider = 'gemini';
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
    return false;
  }
};

export const initializeLocalLLM = (url: string) => {
  localLlmUrl = url;
  currentProvider = 'local';
  return true;
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InventoryContext {
  currentLocation: string;
  totalWarehouses: number;
  totalItems: number;
  recentItems: Array<{name: string, location: string, quantity: number}>;
  structureInfo: string;
}

// Функции для выполнения команд SMARTIE (переиспользуем из claudeService)
const availableActions = {
  createWarehouse: (name: string) => {
    const warehouse = localStorageService.addWarehouse(name);
    return `✅ Склад "${name}" создан успешно.`;
  },

  createRoom: (warehouseName: string, roomName: string) => {
    try {
      const warehouse = localStorageService.findEntityByNameAndType(warehouseName, 'warehouse');
      if (!warehouse) return `❌ Склад "${warehouseName}" не найден.`;
      
      const room = localStorageService.addRoom(warehouse.id, roomName);
      return `✅ Комната "${roomName}" создана в складе "${warehouseName}".`;
    } catch (error) {
      return `❌ Ошибка создания комнаты: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  createContainer: (warehouseName: string, roomName: string, containerName: string) => {
    try {
      const warehouse = localStorageService.findEntityByNameAndType(warehouseName, 'warehouse');
      if (!warehouse) return `❌ Склад "${warehouseName}" не найден.`;
      
      const room = localStorageService.findEntityByNameAndType(roomName, 'room', warehouseName);
      if (!room) return `❌ Комната "${roomName}" не найдена в складе "${warehouseName}".`;
      
      const container = localStorageService.addShelf(warehouse.id, room.id, containerName);
      return `✅ Контейнер "${containerName}" создан в комнате "${roomName}" склада "${warehouseName}".`;
    } catch (error) {
      return `❌ Ошибка создания контейнера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  addItem: (warehouseName: string, roomName: string, containerName: string, itemData: ItemCore) => {
    try {
      const warehouse = localStorageService.findEntityByNameAndType(warehouseName, 'warehouse');
      if (!warehouse) return `❌ Склад "${warehouseName}" не найден.`;
      
      const room = localStorageService.findEntityByNameAndType(roomName, 'room', warehouseName);
      if (!room) return `❌ Комната "${roomName}" не найдена.`;
      
      const container = localStorageService.findEntityByNameAndType(containerName, 'shelf', warehouseName, roomName);
      if (!container) return `❌ Контейнер "${containerName}" не найден.`;
      
      const item = localStorageService.addItem(warehouse.id, room.id, container.id, itemData);
      return `✅ Товар "${itemData.name}" (${itemData.quantity} ${itemData.unit || 'шт'}) добавлен в "${containerName}".`;
    } catch (error) {
      return `❌ Ошибка добавления товара: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  searchItems: (itemName: string) => {
    const results = localStorageService.findItemsByName(itemName);
    if (results.length === 0) {
      return `❌ Товар "${itemName}" не найден.`;
    }
    
    let response = `🔍 Найдено товаров "${itemName}": ${results.length}\n\n`;
    results.forEach(item => {
      response += `📦 ${item.quantity} ${item.unit || 'шт'} в ${item.path}\n`;
    });
    return response;
  },

  getInventorySummary: () => {
    const summary = localStorageService.getInventorySummary();
    let response = `📊 **Сводка по складу:**\n\n`;
    response += `🏢 Складов: ${summary.totalWarehouses}\n`;
    response += `🏠 Комнат: ${summary.totalRooms}\n`;
    response += `📦 Контейнеров: ${summary.totalShelves}\n`;
    response += `📋 Всего товаров: ${summary.totalItems}\n\n`;
    
    if (summary.expiringSoon && summary.expiringSoon.length > 0) {
      response += `⚠️ **Истекающие товары:**\n`;
      summary.expiringSoon.slice(0, 5).forEach(item => {
        response += `• ${item.itemName} - ${item.expiryDate} (${item.path})\n`;
      });
    }
    
    return response;
  },

  addToBucket: (itemData: ItemCore) => {
    try {
      if (itemData.expiryDate) {
        const expiryDate = new Date(itemData.expiryDate);
        if (!isNaN(expiryDate.getTime())) {
          itemData.expiryDate = expiryDate.toISOString().split('T')[0];
        }
      }
      
      const itemWithId = {
        ...itemData,
        id: itemData.id || uuidv4()
      };
      
      const bucketItem = localStorageService.addItemToBucket(itemWithId as any, 'Добавлено через SMARTIE');
      
      let displayDate = '';
      if (itemData.expiryDate) {
        const date = new Date(itemData.expiryDate);
        displayDate = ` со сроком годности до ${date.toLocaleDateString('ru-RU')}`;
      }
      
      let priceInfo = '';
      if (itemData.price && itemData.currency) {
        priceInfo = ` по цене ${itemData.price} ${itemData.currency}`;
      } else if (itemData.price) {
        priceInfo = ` по цене ${itemData.price}`;
      }
      
      return `✅ Товар "${itemData.name}" (${itemData.quantity} ${itemData.unit || 'шт'}) добавлен в Bucket${priceInfo}${displayDate}.`;
    } catch (error) {
      return `❌ Ошибка добавления в Bucket: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  moveItemFromBucket: (itemName: string, warehouseName: string, roomName: string, containerName: string) => {
    try {
      const bucketItems = localStorageService.getBucketItems();
      
      let item = bucketItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (!item) {
        item = bucketItems.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
      }
      
      if (!item) {
        return `❌ Товар "${itemName}" не найден в Bucket. Доступные товары: ${bucketItems.map(i => i.name).join(', ')}`;
      }

      const warehouse = localStorageService.findEntityByNameAndType(warehouseName, 'warehouse');
      if (!warehouse) return `❌ Склад "${warehouseName}" не найден.`;
      
      const room = localStorageService.findEntityByNameAndType(roomName, 'room', warehouseName);
      if (!room) return `❌ Комната "${roomName}" не найдена в складе "${warehouseName}".`;
      
      const container = localStorageService.findEntityByNameAndType(containerName, 'shelf', warehouseName, roomName);
      if (!container) return `❌ Контейнер "${containerName}" не найден в комнате "${roomName}".`;

      const { id, originalPath, destination, isReadyToTransfer, ...itemDataToMove } = item;
      
      localStorageService.addItem(warehouse.id, room.id, container.id, itemDataToMove as ItemCore);
      localStorageService.removeBucketItem(item.id);
      
      return `✅ Товар "${itemName}" перемещён из Bucket в "${containerName}" (${warehouseName} > ${roomName}).`;
    } catch (error) {
      return `❌ Ошибка перемещения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  getBucketItems: () => {
    try {
      const bucketItems = localStorageService.getBucketItems();
      if (bucketItems.length === 0) {
        return `📭 Bucket пуст.`;
      }
      
      let response = `📦 **Товары в Bucket:**\n\n`;
      bucketItems.forEach(item => {
        response += `• ${item.name} - ${item.quantity} ${item.unit || 'шт'}`;
        if (item.expiryDate) response += ` (до ${item.expiryDate})`;
        response += `\n`;
      });
      
      return response;
    } catch (error) {
      return `❌ Ошибка получения Bucket: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
};

const getCurrentContext = (): InventoryContext => {
  const summary = localStorageService.getInventorySummary();
  const warehouses = localStorageService.getWarehouses();
  const bucketItems = localStorageService.getBucketItems();
  
  let structureInfo = '';
  warehouses.forEach(warehouse => {
    structureInfo += `\n🏢 Склад: ${warehouse.name}`;
    if (warehouse.rooms && warehouse.rooms.length > 0) {
      warehouse.rooms.forEach(room => {
        structureInfo += `\n  🏠 Комната: ${room.name}`;
        if (room.shelves && room.shelves.length > 0) {
          room.shelves.forEach(shelf => {
            structureInfo += `\n    📦 Контейнер: ${shelf.name}`;
            if (shelf.items && shelf.items.length > 0) {
              structureInfo += ` (${shelf.items.length} товаров)`;
            }
          });
        }
      });
    }
  });
  
  let bucketInfo = '';
  if (bucketItems.length > 0) {
    bucketInfo = `\n\n📦 **КОРЗИНА (BUCKET):**`;
    bucketItems.forEach(item => {
      const priceStr = item.price && item.currency ? ` - ${item.price} ${item.currency}` : '';
      bucketInfo += `\n• ${item.name} (${item.quantity} ${item.unit || 'шт'})${priceStr}`;
    });
  } else {
    bucketInfo = '\n\n📭 Корзина (Bucket) пуста';
  }
  
  return {
    currentLocation: "Главный экран",
    totalWarehouses: summary.totalWarehouses,
    totalItems: summary.totalItems,
    recentItems: summary.items.slice(0, 5).map(item => ({
      name: item.itemName,
      location: item.path,
      quantity: item.quantity
    })),
    structureInfo: (structureInfo || '\n(Нет созданных складов)') + bucketInfo
  };
};

// Универсальная функция для отправки сообщений SMARTIE
export const sendMessageToSMARTIE = async (
  message: string, 
  chatHistory: ChatMessage[] = []
): Promise<string> => {
  const context = getCurrentContext();
  
  const systemPrompt = `Ты SMARTIE - умный помощник для системы управления складом.

**Текущий контекст:**
- Местонахождение: ${context.currentLocation}
- Складов: ${context.totalWarehouses}
- Всего товаров: ${context.totalItems}

**СУЩЕСТВУЮЩАЯ СТРУКТУРА СКЛАДОВ:${context.structureInfo}

**Недавние товары:**
${context.recentItems.map(item => `• ${item.name} (${item.quantity} шт) - ${item.location}`).join('\n')}

**Доступные команды:**
1. Создать склад: "создай склад [название]"
2. Создать комнату: "создай комнату [название] в складе [склад]"
3. Создать контейнер: "создай контейнер [название] в комнате [комната] склада [склад]"
4. Добавить товар: "добавь [количество] [товар] в [контейнер]"
5. Добавить в Bucket: "добавь в bucket [товар]"
6. Переместить из Bucket: "перемести [товар] в [контейнер]"
7. Найти товар: "найди [товар]" или "где [товар]"
8. Показать Bucket: "что в bucket" или "покажи bucket"
9. Сводка: "покажи сводку" или "статистика"

**Правила:**
- Отвечай на русском языке (или языке пользователя)
- Будь дружелюбным и полезным
- МОЖЕШЬ ВЫПОЛНЯТЬ НЕСКОЛЬКО КОМАНД ЗА РАЗ!
- При создании нескольких товаров - обрабатывай их все сразу в одном ответе
- Если команда неясна, спрашивай уточнения
- Используй эмодзи для лучшего восприятия
- Запоминай контекст разговора
- ВАЖНО: Сегодня ${new Date().toLocaleDateString('ru-RU')} (${new Date().toISOString().split('T')[0]})
- ПОДДЕРЖИВАЙ ВСЕ ВАЛЮТЫ: USD, EUR, UAH, RUB, PLN

**Если нужно выполнить действия:**
Для ОДНОЙ команды:
ACTION: [тип_действия]
PARAMS: {"param1": "value1", "param2": "value2"}
MESSAGE: [сообщение_пользователю]

Для НЕСКОЛЬКИХ команд:
MULTI_ACTION_START
ACTION: [тип_действия1]
PARAMS: {"param1": "value1"}
ACTION: [тип_действия2]
PARAMS: {"param1": "value1"}
MULTI_ACTION_END
MESSAGE: [общее_сообщение_пользователю]

Типы действий и их параметры:
- createWarehouse: {"name": "название"}
- createRoom: {"warehouseName": "склад", "roomName": "комната"}  
- createContainer: {"warehouseName": "склад", "roomName": "комната", "containerName": "контейнер"}
- addItem: {"warehouseName": "склад", "roomName": "комната", "containerName": "контейнер", "name": "товар", "quantity": число, "unit": "единица", "price": число, "currency": "USD|EUR|UAH|RUB|PLN", "expiryDate": "YYYY-MM-DD", "description": "описание", "labels": ["тег1", "тег2"]}
- addToBucket: {"name": "товар", "quantity": число, "unit": "единица", "price": число, "currency": "USD|EUR|UAH|RUB|PLN", "expiryDate": "YYYY-MM-DD", "description": "описание", "labels": ["тег1", "тег2"]}
- moveItemFromBucket: {"itemName": "товар", "warehouseName": "склад", "roomName": "комната", "containerName": "контейнер"}
- getBucketItems: {}
- searchItems: {"itemName": "название"}
- getInventorySummary: {}`;

  try {
    let responseText = '';
    
    switch (currentProvider) {
      case 'claude':
        responseText = await sendToClaudeAPI(systemPrompt, message, chatHistory);
        break;
      case 'openai':
        responseText = await sendToOpenAI(systemPrompt, message, chatHistory);
        break;
      case 'gemini':
        responseText = await sendToGemini(systemPrompt, message, chatHistory);
        break;
      case 'local':
        responseText = await sendToLocalLLM(systemPrompt, message, chatHistory);
        break;
      default:
        throw new Error('No AI provider initialized');
    }
    
    // Проверяем, есть ли команда для выполнения
    if (responseText.includes('ACTION:') || responseText.includes('MULTI_ACTION_START')) {
      return await executeAction(responseText);
    }
    
    return responseText;
  } catch (error) {
    console.error('SMARTIE AI Error:', error);
    return `❌ Ошибка ${currentProvider.toUpperCase()} API: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
  }
};

// Отправка в Claude API
const sendToClaudeAPI = async (systemPrompt: string, message: string, chatHistory: ChatMessage[]): Promise<string> => {
  if (!claudeAPI) throw new Error('Claude API не инициализирован');

  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: message }
  ];

  const response = await claudeAPI.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
};

// Отправка в OpenAI API
const sendToOpenAI = async (systemPrompt: string, message: string, chatHistory: ChatMessage[]): Promise<string> => {
  if (!openaiAPI) throw new Error('OpenAI API не инициализирован');

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: message }
  ];

  const response = await openaiAPI.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7
  });

  return response.choices[0]?.message?.content || '';
};

// Отправка в Gemini API
const sendToGemini = async (systemPrompt: string, message: string, chatHistory: ChatMessage[]): Promise<string> => {
  if (!geminiAPI) throw new Error('Gemini API не инициализирован');

  // Формируем полный промпт для Gemini
  let fullPrompt = systemPrompt + '\n\n';
  
  // Добавляем историю чата
  chatHistory.forEach(msg => {
    fullPrompt += `${msg.role === 'user' ? 'Пользователь' : 'Помощник'}: ${msg.content}\n`;
  });
  
  fullPrompt += `Пользователь: ${message}\nПомощник:`;

  const result = await geminiAPI.generateContent(fullPrompt);
  const response = await result.response;
  return response.text() || '';
};

// Отправка в Local LLM
const sendToLocalLLM = async (systemPrompt: string, message: string, chatHistory: ChatMessage[]): Promise<string> => {
  if (!localLlmUrl) throw new Error('Local LLM URL не установлен');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: message }
  ];

  const response = await fetch(`${localLlmUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: messages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || data.response || '';
};

// Функции выполнения действий (переиспользуем из claudeService)
const executeAction = async (responseText: string): Promise<string> => {
  try {
    const isMultiAction = responseText.includes('MULTI_ACTION_START');
    
    if (isMultiAction) {
      return await executeMultipleActions(responseText);
    } else {
      return await executeSingleAction(responseText);
    }
    
  } catch (error) {
    console.error('Action execution error:', error);
    return `❌ Ошибка выполнения команды: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
  }
};

const executeSingleAction = async (responseText: string): Promise<string> => {
  const actionMatch = responseText.match(/ACTION:\s*(\w+)/);
  const paramsMatch = responseText.match(/PARAMS:\s*({.*?})/s);
  const messageMatch = responseText.match(/MESSAGE:\s*(.*?)(?=ACTION:|PARAMS:|$)/s);
  
  if (!actionMatch) return responseText;
  
  const actionType = actionMatch[1];
  const params = parseParams(paramsMatch?.[1] || '{}');
  const userMessage = messageMatch ? messageMatch[1].trim() : '';
  
  const result = await executeCommand(actionType, params);
  return userMessage ? `${userMessage}\n\n${result}` : result;
};

const executeMultipleActions = async (responseText: string): Promise<string> => {
  const multiActionMatch = responseText.match(/MULTI_ACTION_START(.*?)MULTI_ACTION_END/s);
  const messageMatch = responseText.match(/MESSAGE:\s*(.*?)$/s);
  
  if (!multiActionMatch) return responseText;
  
  const actionsBlock = multiActionMatch[1];
  const userMessage = messageMatch ? messageMatch[1].trim() : '';
  
  const actionMatches = actionsBlock.match(/ACTION:\s*(\w+)\s*\nPARAMS:\s*(\{[\s\S]*?\})(?=\s*ACTION:|\s*$)/g);
  
  if (!actionMatches) return responseText;
  
  let results: string[] = [];
  const maxCommands = 10; // Для demo версии ограничиваем
  
  for (let i = 0; i < Math.min(actionMatches.length, maxCommands); i++) {
    const actionMatch = actionMatches[i];
    const actionTypeMatch = actionMatch.match(/ACTION:\s*(\w+)/);
    const paramsTextMatch = actionMatch.match(/PARAMS:\s*(\{[\s\S]*?\})/);
    
    if (actionTypeMatch) {
      const actionType = actionTypeMatch[1];
      const params = parseParams(paramsTextMatch?.[1] || '{}');
      
      const result = await executeCommand(actionType, params);
      results.push(result);
    }
  }
  
  const allResults = results.join('\n');
  return userMessage ? `${userMessage}\n\n${allResults}` : allResults;
};

const parseParams = (jsonString: string): any => {
  try {
    let cleanJson = jsonString.trim();
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleanJson);
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Raw JSON:', jsonString);
    return {};
  }
};

const executeCommand = async (actionType: string, params: any): Promise<string> => {
  switch (actionType) {
    case 'createWarehouse':
      return availableActions.createWarehouse(params.name || '');
    case 'createRoom':
      return availableActions.createRoom(params.warehouseName || '', params.roomName || '');
    case 'createContainer':
      return availableActions.createContainer(params.warehouseName || '', params.roomName || '', params.containerName || '');
    case 'addItem':
      const itemData: ItemCore = {
        name: params.name || 'Unnamed Item',
        quantity: params.quantity || 1,
        unit: params.unit || 'pcs',
        priority: params.priority || 'Normal',
        category: params.category,
        price: params.price,
        currency: params.currency,
        expiryDate: params.expiryDate,
        description: params.description,
        labels: params.labels
      };
      return availableActions.addItem(params.warehouseName || '', params.roomName || '', params.containerName || '', itemData);
    case 'searchItems':
      return availableActions.searchItems(params.itemName || '');
    case 'addToBucket':
      const bucketItemData: ItemCore = {
        name: params.name || 'Unnamed Item',
        quantity: params.quantity || 1,
        unit: params.unit || 'pcs',
        priority: params.priority || 'Normal',
        category: params.category,
        price: params.price,
        currency: params.currency,
        expiryDate: params.expiryDate,
        description: params.description,
        labels: params.labels
      };
      return availableActions.addToBucket(bucketItemData);
    case 'moveItemFromBucket':
      return availableActions.moveItemFromBucket(params.itemName || '', params.warehouseName || '', params.roomName || '', params.containerName || '');
    case 'getBucketItems':
      return availableActions.getBucketItems();
    case 'getInventorySummary':
      return availableActions.getInventorySummary();
    default:
      return `❌ Неизвестная команда: ${actionType}`;
  }
};

// Вспомогательные функции
export const getCurrentProvider = (): AIProvider => currentProvider;

export const setProvider = (provider: AIProvider) => {
  currentProvider = provider;
};

export const isAnyProviderInitialized = (): boolean => {
  return claudeAPI !== null || openaiAPI !== null || geminiAPI !== null || localLlmUrl !== '';
};

export const getAvailableProviders = (): AIProvider[] => {
  const providers: AIProvider[] = [];
  if (claudeAPI) providers.push('claude');
  if (openaiAPI) providers.push('openai');
  if (geminiAPI) providers.push('gemini');
  if (localLlmUrl) providers.push('local');
  return providers;
};