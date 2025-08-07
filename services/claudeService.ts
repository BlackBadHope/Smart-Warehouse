import Anthropic from '@anthropic-ai/sdk';
import * as localStorageService from './localStorageService';
import { ItemCore } from '../types';

// Примечание: В продакшене API ключ должен быть в переменных окружения
// Для тестирования нужно будет ввести ключ в UI
let anthropic: Anthropic | null = null;

export const initializeClaudeAPI = (apiKey: string) => {
  anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Только для тестирования!
  });
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
}

// Функции для выполнения команд SMARTIE
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
      // Исправляем дату истечения срока годности
      if (itemData.expiryDate) {
        const expiryDate = new Date(itemData.expiryDate);
        if (!isNaN(expiryDate.getTime())) {
          itemData.expiryDate = expiryDate.toISOString().split('T')[0];
        }
      }
      
      const bucketItem = localStorageService.addItemToBucket(itemData as any, 'Добавлено через SMARTIE');
      return `✅ Товар "${itemData.name}" добавлен в Bucket (промежуточную зону).`;
    } catch (error) {
      return `❌ Ошибка добавления в Bucket: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  },

  moveItemFromBucket: (itemName: string, warehouseName: string, roomName: string, containerName: string) => {
    try {
      // Найти товар в bucket
      const bucketItems = localStorageService.getBucketItems();
      const item = bucketItems.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
      
      if (!item) {
        return `❌ Товар "${itemName}" не найден в Bucket.`;
      }

      // Найти целевой контейнер
      const warehouse = localStorageService.findEntityByNameAndType(warehouseName, 'warehouse');
      if (!warehouse) return `❌ Склад "${warehouseName}" не найден.`;
      
      const room = localStorageService.findEntityByNameAndType(roomName, 'room', warehouseName);
      if (!room) return `❌ Комната "${roomName}" не найдена.`;
      
      const container = localStorageService.findEntityByNameAndType(containerName, 'shelf', warehouseName, roomName);
      if (!container) return `❌ Контейнер "${containerName}" не найден.`;

      // Переместить товар
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
  return {
    currentLocation: "Главный экран",
    totalWarehouses: summary.totalWarehouses,
    totalItems: summary.totalItems,
    recentItems: summary.items.slice(0, 5).map(item => ({
      name: item.itemName,
      location: item.path,
      quantity: item.quantity
    }))
  };
};

export const sendMessageToSMARTIE = async (
  message: string, 
  chatHistory: ChatMessage[] = []
): Promise<string> => {
  if (!anthropic) {
    throw new Error('Claude API не инициализирован. Введите API ключ.');
  }

  const context = getCurrentContext();
  
  const systemPrompt = `Ты SMARTIE - умный помощник для системы управления складом.

**Текущий контекст:**
- Местонахождение: ${context.currentLocation}
- Складов: ${context.totalWarehouses}
- Всего товаров: ${context.totalItems}

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
- Отвечай на русском языке
- Будь дружелюбным и полезным
- ВЫПОЛНЯЙ ТОЛЬКО ОДНУ КОМАНДУ ЗА РАЗ!
- Если пользователь просит несколько действий - выполни первое, затем спроси что делать дальше
- Если команда неясна, спрашивай уточнения
- Используй эмодзи для лучшего восприятия
- Запоминай контекст разговора

**Если нужно выполнить действие:**
Отвечай СТРОГО в формате:
ACTION: [тип_действия]
PARAMS: {"param1": "value1", "param2": "value2"}
MESSAGE: [сообщение_пользователю]

ВАЖНО:
- JSON в PARAMS должен быть валидным
- Все строки в двойных кавычках
- Никаких лишних запятых
- Используй только указанные параметры

Типы действий и их параметры:
- createWarehouse: {"name": "название"}
- createRoom: {"warehouseName": "склад", "roomName": "комната"}  
- createContainer: {"warehouseName": "склад", "roomName": "комната", "containerName": "контейнер"}
- addItem: {"warehouseName": "склад", "roomName": "комната", "containerName": "контейнер", "name": "товар", "quantity": число, "unit": "единица", "price": число, "expiryDate": "YYYY-MM-DD", "description": "описание", "labels": ["тег1", "тег2"]}
- addToBucket: {"name": "товар", "quantity": число, "unit": "единица", "price": число, "expiryDate": "YYYY-MM-DD", "description": "описание", "labels": ["тег1", "тег2"]}
- moveItemFromBucket: {"itemName": "товар", "warehouseName": "склад", "roomName": "комната", "containerName": "контейнер"}
- getBucketItems: {}
- searchItems: {"itemName": "название"}
- getInventorySummary: {}`;

  try {
    const messages = [
      ...chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Проверяем, есть ли команда для выполнения
    if (responseText.includes('ACTION:')) {
      return await executeAction(responseText);
    }
    
    return responseText;
  } catch (error) {
    console.error('Claude API Error:', error);
    if (error instanceof Error) {
      return `❌ Ошибка API: ${error.message}`;
    }
    return '❌ Неизвестная ошибка при обращении к SMARTIE.';
  }
};

const executeAction = async (responseText: string): Promise<string> => {
  try {
    const actionMatch = responseText.match(/ACTION:\s*(\w+)/);
    const paramsMatch = responseText.match(/PARAMS:\s*({.*?})/s);
    const messageMatch = responseText.match(/MESSAGE:\s*(.*?)(?=ACTION:|PARAMS:|$)/s);
    
    if (!actionMatch) return responseText;
    
    const actionType = actionMatch[1];
    let params = {};
    
    if (paramsMatch) {
      try {
        // Очистим JSON от возможных проблем
        let jsonString = paramsMatch[1].trim();
        // Удалим trailing запятые
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        params = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw JSON:', paramsMatch[1]);
        return `❌ Ошибка парсинга параметров команды. JSON: ${paramsMatch[1]}`;
      }
    }
    
    const userMessage = messageMatch ? messageMatch[1].trim() : '';
    
    let result = '';
    
    switch (actionType) {
      case 'createWarehouse':
        result = availableActions.createWarehouse(params.name || '');
        break;
      case 'createRoom':
        result = availableActions.createRoom(params.warehouseName || '', params.roomName || '');
        break;
      case 'createContainer':
        result = availableActions.createContainer(params.warehouseName || '', params.roomName || '', params.containerName || '');
        break;
      case 'addItem':
        const itemData: ItemCore = {
          name: params.name || 'Unnamed Item',
          quantity: params.quantity || 1,
          unit: params.unit || 'pcs',
          priority: params.priority || 'Normal',
          category: params.category,
          price: params.price,
          expiryDate: params.expiryDate,
          description: params.description,
          labels: params.labels
        };
        result = availableActions.addItem(params.warehouseName || '', params.roomName || '', params.containerName || '', itemData);
        break;
      case 'searchItems':
        result = availableActions.searchItems(params.itemName || '');
        break;
      case 'addToBucket':
        const bucketItemData: ItemCore = {
          name: params.name || 'Unnamed Item',
          quantity: params.quantity || 1,
          unit: params.unit || 'pcs',
          priority: params.priority || 'Normal',
          category: params.category,
          price: params.price,
          expiryDate: params.expiryDate,
          description: params.description,
          labels: params.labels
        };
        result = availableActions.addToBucket(bucketItemData);
        break;
      case 'moveItemFromBucket':
        result = availableActions.moveItemFromBucket(params.itemName || '', params.warehouseName || '', params.roomName || '', params.containerName || '');
        break;
      case 'getBucketItems':
        result = availableActions.getBucketItems();
        break;
      case 'getInventorySummary':
        result = availableActions.getInventorySummary();
        break;
      default:
        result = userMessage || responseText;
    }
    
    return userMessage ? `${userMessage}\n\n${result}` : result;
    
  } catch (error) {
    console.error('Action execution error:', error);
    return `❌ Ошибка выполнения команды: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
  }
};

export const isClaudeInitialized = (): boolean => {
  return anthropic !== null;
};