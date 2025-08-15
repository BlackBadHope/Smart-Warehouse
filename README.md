# Inventory OS - Professional Inventory Management System

**Девиз**: "КАТАЛОГИЗИРУЙ ВСЕЛЕННУЮ"

Professional inventory management system with offline-first architecture and P2P synchronization. Built for scale from personal use to enterprise systems with 100-100,000 users.

## 🚀 Current Status

**Version**: 2.6.0  
**Platform**: Flutter + dart:io HttpServer  
**Development Status**: ~80% complete  
**Architecture**: LocalSend-inspired P2P system  

## ⚡ Key Features

### Core Functionality
- **Multi-level Organization**: Warehouses → Rooms → Containers → Items
- **Offline-First**: SQLite database with local storage
- **P2P Synchronization**: Real-time device discovery and data sync
- **QR Code Integration**: Device pairing and item management
- **Role-Based Access**: Admin/User permissions with conflict resolution

### Architecture Highlights
- **Cross-Platform**: Android, iOS, Desktop, Web support
- **Device Discovery**: mDNS multicast discovery (LocalSend-style)
- **HTTP API**: dart:io server on port 53317
- **Data Sync**: CRDT + Role-based hybrid approach
- **Security Ready**: WiFi control and GPS geofencing (Phase 2)

## 🛠 Technical Stack

```yaml
Framework: Flutter ^3.6.0
Database: SQLite (sqflite ^2.3.0)
Networking: dart:io + HTTP ^1.2.2
P2P Discovery: multicast_dns ^0.3.2
QR Scanning: mobile_scanner ^4.0.1
State Management: Built-in + shared_preferences
```

## 📱 Recent Bug Fixes (August 2025)

1. **Item Addition**: Fixed `_loadItems()` call after item creation
2. **QR Scanning**: Implemented full `QRScannerScreen` with mobile_scanner
3. **Data Clearing**: Added proper `clearAllData()` in storage provider  
4. **Navigation**: Fixed all screen transitions and routing
5. **UI Terminology**: Updated "Shelf" → "Container" throughout

## 🏗 Installation & Setup

### Prerequisites
- Flutter SDK ^3.6.0
- Android Studio / VS Code
- Git

### Quick Start
```bash
# Clone repository
git clone [repository-url]
cd inventory-os-v2.6

# Install dependencies
flutter pub get

# Run on Android
flutter run

# Build APK
flutter build apk --release
```

### P2P Network Setup
The app automatically:
1. Starts HTTP server on port 53317
2. Broadcasts device availability via mDNS
3. Discovers nearby devices
4. Enables QR code pairing

## 📊 Development Roadmap

### Phase 1 (Current - 80% Complete)
- ✅ Core inventory management
- ✅ P2P networking foundation  
- ✅ Offline-first architecture
- ✅ QR code integration
- 🔄 Production testing & optimization

### Phase 2: Enterprise Features
- Multi-currency & multi-language UI
- Location-based access control (GPS geofencing)
- Advanced analytics and reporting
- Import/Export (JSON, CSV)

### Phase 3: AI Integration
- SMARTIE assistant (Claude, OpenAI, Local LLM)
- Chat interface for inventory queries
- Smart recommendations and auto-categorization

### Phase 4: IoT & Advanced
- Barcode scanning integration
- IoT device connectivity
- AR/VR interfaces
- Enterprise scalability

## 🔒 Security Architecture

### Item Locking System
```
AVAILABLE → LOCKED → PHANTOM → TRASH (15min) → DELETE (24h)
```

### Access Control (Phase 2)
```dart
// WiFi Control
allowedSSIDs: ["Office-WiFi", "Home"]
allowOffline: boolean
gracePeriod: 15 // minutes

// GPS Geofencing  
latitude: 50.4501
longitude: 30.5234
radius: 100 // meters
```

## 🌍 Language Policy

- **Priority**: Ukrainian (support during war)
- **Russian**: Technical tool only, not priority
- **English**: International market expansion

## 📋 Project Philosophy

> "Правильные решения уже придуманы кем-то" - study existing solutions instead of reinventing the wheel.

### Core Principles
- Study LocalSend → proven P2P architecture
- Flutter + dart:io → cross-platform native performance  
- CRDT + Role-based → conflict resolution
- Professional positioning → enterprise-ready

### Critical Lessons Learned
- ❌ Theoretical solutions without proven analogs
- ❌ WebRTC for simple tasks (overcomplicated)
- ❌ "Family app" positioning (limits scale)
- ✅ Analyze successful projects (LocalSend model)
- ✅ Choose mature platforms (Flutter ecosystem)
- ✅ Professional presentation (enterprise market)

## 🚀 Deployment

### Mobile App Stores
- **Google Play**: $25 developer registration
- **iOS App Store**: $99/year Apple Developer Program  
- **Requirement**: 100% functionality before store submission

### APK Naming Convention
- ✅ Semantic versioning: `inventory-os-v2.6.0.apk`
- ❌ Descriptive names: `inventory-os-v2.6-flutter-FULL-WORKING.apk`

## 🤝 Contributing

This is a professional inventory management system in active development. The project prioritizes:

1. **Proven Architecture**: Based on successful P2P implementations
2. **Cross-Platform**: Flutter for maximum compatibility
3. **Enterprise Ready**: Designed for 100-100,000 user scale
4. **Production Quality**: 100% functionality target before release

---

**Target Market**: Personal to Enterprise inventory management  
**Deployment Goal**: Google Play & iOS App Store  
**Development Status**: Pre-production testing phase
