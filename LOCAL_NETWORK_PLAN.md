# HOME EDITION - Локальная сеть

## Архитектура

```
📱 Device A (Master)     📱 Device B (Client)     💻 Device C (Client)
    ↓                        ↓                        ↓
📡 Local Server          📡 Client App            📡 Client App
(Node.js + SQLite)      (React PWA)             (React PWA)
    ↓                        ↓                        ↓
🔄 WebSocket Server ←→ 🔄 WebSocket Client ←→ 🔄 WebSocket Client
```

## Технические решения

### 1. Локальный сервер (главное устройство)
- **Node.js + Express** - веб-сервер
- **SQLite** - локальная база данных  
- **WebSocket** - реальное время синхронизации
- **mDNS/Bonjour** - автопоиск в сети

### 2. Клиентские устройства
- **React PWA** - веб-приложение
- **Service Worker** - оффлайн работа
- **WebSocket Client** - синхронизация
- **Auto-discovery** - поиск сервера

### 3. Синхронизация данных
- **Conflict resolution** - разрешение конфликтов
- **Offline queue** - очередь при отключении
- **Incremental sync** - только изменения

## Ограничения FREE версии
- ✅ 2 склада максимум
- ✅ 10 комнат максимум  
- ✅ Безлимит контейнеров и товаров
- ✅ До 5 устройств в сети

## Покупные расширения
- 🔓 **HOME PRO ($9.99)** - безлимит складов и комнат
- 🔓 **MULTI-LOCATION ($19.99)** - до 20 устройств
- 🔓 **ANALYTICS PRO ($14.99)** - расширенная аналитика