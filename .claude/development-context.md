# Inventory OS - Development Context & Key Decisions

## КРИТИЧЕСКИ ВАЖНО: Читать в начале каждой сессии! 🚨

### Философия проекта
**"Правильные решения уже придуманы кем-то"** - изучай существующие решения вместо изобретения велосипеда.

### Реальное видение проекта
- **НЕ "семейное приложение"** - это профессиональная система каталогизации
- **Девиз**: "КАТАЛОГИЗИРУЙ ВСЕЛЕННУЮ" 
- **Цель**: Полный каталог всех вещей с ИИ советами и будущей интеграцией (умный дом, IoT, VR/AR)
- **Масштаб**: От личного использования до корпоративных систем на 100-100000 пользователей

### Текущий технический статус

#### Платформа и ограничения
- **Текущая**: React + TypeScript + Vite + Capacitor
- **Проблема**: Capacitor НЕ МОЖЕТ создать нативный HTTP сервер на Android
- **Решение**: Миграция на Flutter (как LocalSend)

#### P2P Evolution (4 попытки):
1. `simpleP2PService.ts` - BroadcastChannel (работает только в одном браузере)
2. `simpleQRP2PService.ts` - WebRTC без STUN (сложно, ненадежно)
3. `localSendStyleService.ts` - Service Worker HTTP симуляция (браузерный костыль)
4. `nativeLocalSendService.ts` - Capacitor HTTP попытка (failed to start server на Android)

#### Последний APK
`inventory-os-v2.6-native-localsend.apk` - финальная попытка на Capacitor

### LocalSend как эталон

#### Почему LocalSend?
- **Доказанное решение**: миллионы загрузок, стабильная работа P2P на мобильных
- **Техстек**: Flutter + dart:io HttpServer + multicast_dns
- **Результат**: Нативный HTTP сервер, автообнаружение устройств, кроссплатформенность

#### Принцип работы LocalSend:
1. dart:io HttpServer на случайном порту
2. Multicast UDP объявление (224.0.0.167:53317)
3. mDNS discovery для поиска устройств
4. HTTP POST для передачи данных
5. TLS шифрование

### Критические архитектурные решения

#### Синхронизация данных (Data Conflict Resolution)
**Hybrid подход**:
1. **Добавление items** → CRDT (UUID + timestamp, оба сохраняются)
2. **Изменение существующих** → Role + Timestamp priority
3. **Критичные операции** → Manual resolution

#### Система "Взято в работу" (Item Locking) 🔒
**ОБЯЗАТЕЛЬНАЯ функция** для collaborative editing:

```typescript
enum ItemState {
  AVAILABLE = 'available',      // Свободен
  LOCKED = 'locked',           // Взят в работу  
  PHANTOM = 'phantom',         // Фантом (показываем где был)
  TRASH_PENDING = 'trash_pending'  // Ожидает удаления
}
```

**Workflow**:
1. Пользователь берет предмет → item блокируется
2. Другие видят фантом: "🔒 Взято в работу: UserA ⏰ Осталось: 12 мин"
3. Фантом нельзя редактировать никому кроме владельца lock'а
4. Таймер 15 минут → автоматически в Trash → через 24 часа удаляется навсегда

### Языковая политика
- **Приоритет**: Ukrainian (война с Россией, политическая чувствительность)
- **Русский**: Как инструмент, но НЕ как валюта
- **Избегать**: Приоритизации российского языка из-за текущих событий

### Технические детали

#### Capacitor проблемы:
- Буферная загрузка APK при первом запуске (WebView initialization)
- Медленная инициализация React + сервисов
- localStorage операции на Android медленнее
- Кнопки неактивны пока не завершатся useEffect хуки

#### Flutter преимущества:
- Нативная компиляция → мгновенный старт
- Настоящий HTTP сервер (dart:io)
- Отсутствие WebView overhead
- Единый код для всех платформ

### Реализованные функции (что переносить в Flutter)

#### Core:
- Multi-level organization (Warehouses→Rooms→Shelves→Items)
- Offline-first с localStorage
- Multi-currency & multi-language
- Import/Export (JSON, CSV)
- User management с role-based access
- Trash management с soft delete

#### AI Integration:
- Multiple providers (Claude, OpenAI, Local LLM)
- Chat interface для natural language queries
- Barcode scanning
- Smart recommendations

#### P2P Features:
- QR code pairing (упрощенный до 3 кнопок)
- Network discovery simulation
- Conflict resolution
- SimpleQRModal с реальным QR сканером (qr-scanner lib)

### Ошибки которых избегать

#### ❌ Что НЕ работает:
1. Теоретические решения без изучения аналогов
2. Костыли вместо смены платформы  
3. Service Worker как HTTP сервер
4. WebRTC для простых задач
5. "Семейное" позиционирование вместо профессионального

#### ✅ Правильный подход:
1. Изучение LocalSend перед началом
2. Flutter + dart:io для нативного networking
3. CRDT + Role-based conflict resolution
4. Item locking система
5. Профессиональная подача проекта

### Flutter Migration Plan

#### Phase 1: Platform Migration
- Установить Flutter SDK
- `flutter create inventory_os_flutter`
- Портировать UI (React → Flutter widgets)
- Интегрировать dart:io HttpServer
- Добавить multicast_dns для discovery

#### Key Packages:
```yaml
dependencies:
  mobile_scanner: ^4.0.1      # QR сканер
  multicast_dns: ^0.3.2       # Device discovery  
  http: ^1.1.0                 # HTTP клиент
  # dart:io встроен для HTTP сервера
```

#### Phase 2-4: Enhanced features
- AI integration улучшения
- IoT integration  
- Enterprise scalability
- AR/VR interfaces (далекое будущее)

### Мантры проекта
- "Либо найдем как сделал кто-то другой, либо поймем почему никто так не делает"
- "Не изобретаем велосипед. Изучаем чужие велосипеды и делаем свой мотоцикл"
- "Изучение аналогов экономит недели разработки"

---

**ВАЖНО**: Этот контекст должен определять ВСЕ архитектурные решения. Любые предложения костылей или обходов должны сверяться с опытом LocalSend и принципом "правильные решения уже существуют".