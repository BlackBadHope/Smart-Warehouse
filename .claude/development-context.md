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
Контекст не влез, токены закончились, я просто внесу сюда целиком идею. В дальнейшем отредактируй под более удобный для тебя вид (Илья)
  🌐 По SSID (имени WiFi)

  interface WarehouseLocationPolicy {
    warehouseId: string;
    allowedSSIDs: string[];          // ["Office-WiFi", "Home-Network"]
    allowedBSSIDs?: string[];        // MAC адреса роутеров (точнее)
    allowOffline: boolean;           // Доступ без WiFi
    gracePeriod: number;             // Время работы после отключения (минуты)
  }

  // Проверка доступа
  async function checkWiFiAccess(warehouseId: string): Promise<boolean> {
    const currentSSID = await getCurrentWiFiSSID();
    const policy = getWarehousePolicy(warehouseId);

    return policy.allowedSSIDs.includes(currentSSID) ||
           (policy.allowOffline && isOfflineMode());
  }

  📱 Как получить WiFi info:

  - Android (Capacitor): @capacitor-community/wifi plugin
  - Flutter: wifi_info_flutter package
  - Веб: Navigator.connection API (ограниченно)

  Geo-based Access Control

  📍 По GPS координатам

  interface WarehouseGeoPolicy {
    warehouseId: string;
    allowedLocations: GeoFence[];
    accuracy: number;                // Радиус в метрах
    requireGPS: boolean;             // Обязательно включенный GPS
  }

  interface GeoFence {
    latitude: number;
    longitude: number;
    radius: number;                  // Метры
    name: string;                    // "Office", "Warehouse A"
  }

  async function checkGeoAccess(warehouseId: string): Promise<boolean> {
    const currentPos = await getCurrentPosition();
    const policy = getWarehouseGeoPolicy(warehouseId);

    return policy.allowedLocations.some(fence =>
      isWithinRadius(currentPos, fence, fence.radius)
    );
  }

  Security Scenarios

  🏢 Office Warehouse

  const officePolicy: WarehouseLocationPolicy = {
    warehouseId: "office-main",
    allowedSSIDs: ["CompanyWiFi", "CompanyGuest"],
    allowedBSSIDs: ["aa:bb:cc:dd:ee:ff"], // Конкретный роутер
    allowOffline: false,              // Строго в офисе
    gracePeriod: 5                    // 5 минут после отключения
  };

  🏭 Warehouse with GPS

  const warehouseGeoPolicy: WarehouseGeoPolicy = {
    warehouseId: "warehouse-1",
    allowedLocations: [
      {
        latitude: 50.4501,
        longitude: 30.5234,
        radius: 100,                  // 100 метров
        name: "Main Warehouse"
      }
    ],
    accuracy: 50,
    requireGPS: true
  };

  🏠 Home Inventory (Flexible)

  const homePolicy: WarehouseLocationPolicy = {
    warehouseId: "home",
    allowedSSIDs: ["Home-WiFi", "Home-5G"],
    allowOffline: true,               // Можно без WiFi
    gracePeriod: 60                   // Час работы вне дома
  };

  UX Implementation

  🚨 Access Denied Screen

  function AccessDeniedModal({ reason }: { reason: string }) {
    return (
      <div className="access-denied">
        <h2>🔒 Доступ ограничен</h2>
        <p>{reason}</p>
        {reason.includes('WiFi') && (
          <div>
            <p>Подключитесь к разрешенной сети:</p>
            <ul>{allowedNetworks.map(ssid => <li key={ssid}>{ssid}</li>)}</ul>
          </div>
        )}
        {reason.includes('location') && (
          <p>Приблизьтесь к складу (в радиусе {requiredRadius}м)</p>
        )}
      </div>
    );
  }

  ⚠️ Grace Period Warning

  function GracePeriodWarning({ timeLeft }: { timeLeft: number }) {
    return (
      <div className="warning-banner">
        ⚠️ Вне разрешенной зоны. Доступ будет ограничен через {timeLeft} мин.
      </div>
    );
  }

  Privacy Considerations

  🔐 Local Storage Only

  - WiFi SSID - сохраняется локально
  - GPS координаты - НЕ передаются на сервер
  - Проверка происходит на устройстве

  🛡️ Security Benefits

  - Предотвращение кражи данных - нельзя получить доступ удаленно
  - Audit trail - логи попыток доступа вне зоны
  - Compliance - соответствие корпоративным политикам

  Flutter Implementation

  📦 Packages

  dependencies:
    wifi_info_flutter: ^2.0.2    # WiFi info
    geolocator: ^9.0.2           # GPS coordinates
    permission_handler: ^10.4.3  # Permissions

  🔒 Access Guard

  class LocationAccessGuard {
    static Future<bool> checkAccess(String warehouseId) async {
      final wifiAccess = await _checkWiFiAccess(warehouseId);
      final geoAccess = await _checkGeoAccess(warehouseId);

      return wifiAccess || geoAccess;
    }
  }

  Вывод

  Да, это очень полезная security feature!

  Особенно для:
  - Корпоративных складов (строгий WiFi control)
  - Мобильных инвентарей (GPS геозоны)
  - Домашнего использования (flexible WiFi)

  Добавить в development-context.md как Phase 2 security feature.
### Flutter Кроссплатформенная совместимость

#### 📱 Статус поддержки платформ

| Функция | Android | iOS | Windows | macOS | Linux | Web |
|---------|---------|-----|---------|-------|-------|-----|
| **P2P HTTP Server** | ✅ dart:io | ✅ dart:io | ✅ dart:io | ✅ dart:io | ✅ dart:io | ❌ ограничения CORS |
| **QR сканирование** | ✅ mobile_scanner | ✅ mobile_scanner | ❌ не поддерживается | ✅ mobile_scanner | ❌ не поддерживается | ✅ ZXing (только QR) |
| **mDNS поиск** | ⚠️ проблемы Android12+ | ✅ multicast_dns | ❌ нужен flutter_nsd | ✅ multicast_dns | ❌ нужен flutter_nsd | ❌ не поддерживается |
| **SQLite база** | ✅ sqflite | ✅ sqflite | ✅ sqflite | ✅ sqflite | ✅ sqflite | ✅ sqflite |
| **Файлы/настройки** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 🚫 iOS установка и тестирование

**ВАЖНО**: APK НЕ работает на iOS! 

**Варианты для iOS тестирования:**
1. **TestFlight** (рекомендуется) - нужен Apple Developer Account ($99/год)
2. **Xcode + кабель** - только для разработчика с Mac
3. **AltStore/Sideloadly** - неофициально, требует компьютер каждые 7 дней

**Для друзей без Mac:** Можно тестировать Web версию через браузер (но без QR сканера).

#### 🎯 Мануал тестирования P2P

**Требования к устройству:**
- Android 7.0+ (API 24+)
- 50MB свободного места
- WiFi подключение к одной сети
- Разрешения: Camera, Storage, Network

**Тестирование P2P между устройствами:**

1. **Подготовка:**
   - Оба устройства в одной WiFi сети
   - Установить APK на Android устройства
   - Запустить приложение на обоих

2. **Генерация QR кода (Устройство A):**
   - Открыть приложение → WiFi иконка (справа вверху)
   - Нажать "Показать QR код"
   - QR код появится на экране

3. **Сканирование QR кода (Устройство B):**
   - WiFi иконка → "Сканировать QR код"
   - Навести камеру на QR код устройства A
   - Подождать "Подключено к [Имя устройства]"

4. **Проверка соединения:**
   - На обоих устройствах WiFi иконка должна показать цифру "1" (найдено устройств)
   - В логах: "P2P Server started on [IP]:[PORT]"
   - В логах: "Device registered: [название] at [IP]:[PORT]"

5. **Синхронизация данных:**
   - Создать склад на устройстве A
   - На устройстве B проверить появился ли склад
   - *(пока не реализовано полностью, но HTTP endpoints работают)*

**Диагностика проблем:**
- Если QR не сканируется → проверить разрешения камеры
- Если устройства не находят друг друга → проверить WiFi сеть
- Если mDNS не работает → использовать прямое IP подключение

---
**ВАЖНО**: Этот контекст должен определять ВСЕ архитектурные решения. Любые предложения костылей или обходов должны сверяться с опытом LocalSend и принципом "правильные решения уже существуют".