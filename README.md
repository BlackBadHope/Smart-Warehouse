# Inventory OS

Professional inventory management system with offline-first architecture and device synchronization.

## Features

### Core Functionality
- **Multi-level organization**: Warehouses → Rooms → Shelves → Items
- **Offline-first**: Works without internet connection
- **Multi-currency support**: Global currency conversion
- **Multi-language**: English, Russian, Spanish, and more
- **Item management**: Add, edit, delete with custom properties
- **Search & filtering**: Advanced item search with tags
- **Visual interface**: Clean, responsive UI

### Data Management
- **Import/Export**: JSON, CSV data portability
- **Backup system**: Local data backup and restore
- **Trash management**: Soft delete with recovery
- **User profiles**: Multiple user support with role management
- **Encryption**: Optional data encryption for sensitive data

### AI Integration
- **Smart recommendations**: AI-powered item suggestions
- **Multiple AI providers**: Claude, OpenAI, Local LLM support
- **Chat interface**: Natural language inventory queries
- **Barcode scanning**: Product identification and auto-population

### Synchronization
- **P2P networking**: Direct device-to-device sync
- **QR code pairing**: Simple device connection
- **Network discovery**: Automatic device detection
- **Conflict resolution**: Smart merge of simultaneous changes

## Development Status

### Current Platform
- **Frontend**: React + TypeScript + Vite
- **Mobile**: Capacitor for Android/iOS
- **State**: localStorage with offline-first design

### Migration to Flutter
Currently migrating to Flutter platform for:
- Native HTTP server capabilities (dart:io)
- Better P2P networking (multicast_dns)
- Improved mobile performance
- Single codebase for all platforms

## Technical Architecture

### Current Issues
**Problem**: Capacitor cannot create native HTTP servers on mobile platforms, limiting P2P functionality.

**Solution**: Migration to Flutter following LocalSend's proven architecture:
- `dart:io HttpServer` for native networking
- `multicast_dns` for device discovery
- Cross-platform mobile compilation

### P2P Implementation Evolution
1. `simpleP2PService.ts` - BroadcastChannel attempt
2. `simpleQRP2PService.ts` - WebRTC without STUN
3. `localSendStyleService.ts` - Service Worker simulation
4. `nativeLocalSendService.ts` - Capacitor HTTP attempt (current)

## Future Development Plans

### Phase 1: Platform Migration
- Migrate to Flutter for native mobile capabilities
- Implement LocalSend-style P2P networking
- Maintain feature parity with current version

### Phase 2: Enhanced Intelligence
- Improved AI integration for inventory suggestions
- Smart home device connectivity
- IoT sensor integration for automatic tracking

### Phase 3: Scalability
- Cloud synchronization options
- Enterprise deployment capabilities
- Advanced analytics and reporting

### Phase 4: Advanced Interfaces
- Voice control integration
- AR/VR inventory visualization
- Advanced automation features

## Installation

### Android APK
Download latest release: `inventory-os-v2.6-native-localsend.apk`

### Web Version
```bash
npm install
npm run dev
```

### Building
```bash
npm run build
npx cap copy
cd android && ./gradlew assembleDebug
```

## Development Philosophy

**Core Principle**: Study existing solutions before building custom ones.

When facing the P2P networking challenge:
- ❌ Wrong approach: "How to make Capacitor work?"
- ✅ Right approach: "How does LocalSend solve this?"
- **Result**: Platform migration to Flutter

This principle saves weeks of development time and leads to more robust solutions.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.