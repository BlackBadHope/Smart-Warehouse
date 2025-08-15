# Inventory OS - Development Context

## 🚨 КРИТИЧЕСКИ ВАЖНО: Читать в начале каждой сессии!

### Философия проекта
"Правильные решения уже придуманы кем-то" - изучай существующие решения вместо изобретения велосипеда.

### Реальное видение проекта
- **НЕ "семейное приложение"** - это профессиональная система каталогизации
- **Девиз**: "КАТАЛОГИЗИРУЙ ВСЕЛЕННУЮ" 
- **Цель**: Полный каталог всех вещей с ИИ советами и будущей интеграцией
- **Масштаб**: От личного использования до корпоративных систем на 100-100000 пользователей

### ТЕКУЩИЙ СТАТУС (АВГУСТ 2025)

#### ⚠️ Проект в разработке: Flutter P2P система
- **Платформа**: Flutter + dart:io HttpServer
- **Текущий APK**: `inventory-os-v2.6.0.apk` 
- **Миграция**: React → Flutter завершена
- **P2P**: LocalSend архитектура реализована
- **Готовность**: ~80% (нужно 100% для публикации)

#### Публикация в сторах:
- **Google Play**: $25 регистрация разработчика
- **iOS App Store**: $99/год Apple Developer Program
- **Условие**: Приложение должно работать 100% перед попыткой публикации

### P2P Evolution (5 попыток → текущее решение):
1. `simpleP2PService.ts` - BroadcastChannel (одна вкладка)
2. `simpleQRP2PService.ts` - WebRTC (сложно)  
3. `localSendStyleService.ts` - Service Worker (костыль)
4. `nativeLocalSendService.ts` - Capacitor (failed Android)
5. **Flutter + dart:io** - работает, требует доработки

### LocalSend как эталон
- dart:io HttpServer на порту 53317
- Multicast UDP объявление
- Device discovery через mDNS
- HTTP API для синхронизации
- QR code паiring

### Архитектурные решения

#### Синхронизация данных
**Hybrid подход**:
1. **Добавление items** → CRDT (UUID + timestamp)
2. **Изменение существующих** → Role + Timestamp priority  
3. **Критичные операции** → Manual resolution

#### Item Locking System
```
AVAILABLE → LOCKED → PHANTOM → TRASH (15min) → DELETE (24h)
```

### ИСПРАВЛЕННЫЕ БАГИ (АВГУСТ 2025)
1. **Добавление предметов** - исправлен `_loadItems()` после создания
2. **QR сканирование** - создан `QRScannerScreen` с mobile_scanner
3. **Clear All Data** - добавлен `clearAllData()` в provider
4. **Shelf → Container** - переименование в UI
5. **Навигация** - исправлены все переходы между экранами

### Структура экранов (ФИНАЛЬНАЯ):
```
WarehouseListScreen (main.dart)
├── WarehouseDetailScreen
    ├── RoomDetailScreen  
        ├── ShelfDetailScreen [СОЗДАН]
            └── Items management
```

### Версионирование
- ❌ `inventory-os-v2.6-flutter-FULL-WORKING.apk`
- ✅ `inventory-os-v2.6.0.apk` (семантическое версионирование)
- **MAJOR.MINOR.PATCH** - стандарт индустрии

### Security Features (Phase 2)
#### WiFi Access Control
```dart
allowedSSIDs: ["Office-WiFi", "Home"];
allowOffline: boolean;
gracePeriod: 15; // minutes
```

#### GPS Geofencing
```dart
latitude: 50.4501;
longitude: 30.5234; 
radius: 100; // meters
```

#### Сценарии:
- **🏢 Офис**: строгий WiFi контроль
- **🏭 Склад**: GPS геозоны  
- **🏠 Дом**: гибкие настройки

### Реализованные функции
- Multi-level organization (Warehouses→Rooms→Shelves→Items)
- Offline-first с SQLite
- Role-based access control
- P2P server на dart:io
- QR code паiring
- Device discovery

### Планы развития
#### Phase 2: Enterprise Features
- Multi-currency & multi-language UI
- Location-based access control
- Advanced analytics и отчеты
- Import/Export (JSON, CSV)

#### Phase 3: AI Integration  
- SMARTIE (Claude, OpenAI, Local LLM)
- Chat interface
- Smart recommendations
- Auto-categorization

#### Phase 4: IoT & Advanced
- Barcode scanning
- IoT integration
- AR/VR interfaces
- Enterprise scalability

### Языковая политика
- **Приоритет**: Ukrainian (война с Россией)
- **Русский**: Как инструмент, НЕ приоритет
- **English**: Международный рынок

### Критические ошибки (ИЗБЕГАТЬ)
- Теоретические решения без аналогов
- Костыли вместо смены платформы
- WebRTC для простых задач
- "Семейное" позиционирование

### Правильный подход (ДОКАЗАН)
- Изучение LocalSend → успех
- Flutter + dart:io → работает
- CRDT + Role-based → архитектура готова
- Профессиональная подача

### Мантры проекта
- "Либо найдем как сделал кто-то другой, либо поймем почему никто так не делает"
- "Не изобретаем велосипед. Изучаем чужие велосипеды и делаем свой мотоцикл"
- "Изучение аналогов экономит недели разработки"

---
**СТАТУС**: В разработке (~80%)
**ЦЕЛЬ**: 100% готовность перед публикацией в сторах
**СЛЕДУЮЩИЙ ЭТАП**: Полное тестирование P2P, доработка до production quality