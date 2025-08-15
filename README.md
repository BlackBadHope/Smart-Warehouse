# 📦 Inventory OS v2.6 - Smart Inventory Management

Professional inventory management system with P2P synchronization, role-based access control, and advanced offline security.

## 🎯 What is Inventory OS?

A modern **offline-first** inventory management system designed for personal use, small teams, and organizations. Whether you're managing household items, office equipment, or warehouse inventory - Inventory OS provides powerful tools while keeping your data private and secure.

## 🚀 Key Features

### 🔒 **Complete Offline Privacy**
- ✅ **No external servers** - all data stored locally
- ✅ **No API keys required** for core functionality
- ✅ **P2P synchronization** - direct device-to-device connections
- ✅ **End-to-end encryption** - secure data transmission
- ✅ **Role-based security** - multi-level access control

### 👥 **Multi-User Collaboration**
```
Master      → Full system control
├── Admin   → User management + advanced access
├── Editor  → Create/edit own items + collaborative features
├── Viewer  → Read-only access to all data
└── Guest   → Limited access to public items only
```

### 🗑️ **Smart Item Lifecycle**
- **No permanent deletion** - items move to recycle system
- **Time-based disposal** tracking with automatic reminders
- **Easy restoration** from trash at any time
- **Priority-based** management (High/Normal/Low/Dispose)

### 🔄 **Intelligent P2P Sync**
- **10-second debounce** - efficient batch synchronization
- **Conflict resolution** based on user roles and timestamps
- **Offline mode** - changes saved locally and synced when online
- **Real-time status** indicators

## 📱 Installation

### 🖥️ Web Version (Recommended)
```bash
# 1. Clone repository
git clone https://github.com/BlackBadHope/inventory-os
cd inventory-os

# 2. Install dependencies
npm install

# 3. Run application
npm run dev

# 4. Open http://localhost:5173
```

### 📱 Mobile Apps
- **Android APK**: Download from [releases page](https://github.com/BlackBadHope/inventory-os/releases)
- **PWA**: Install directly from web browser ("Add to Home Screen")
- **iOS**: Install as PWA through Safari

### 💻 Desktop Apps
- **Windows/macOS/Linux**: Use web version or build Electron app
- **Self-hosted**: Run local server for network access

## 🏗️ Data Architecture

### 📂 Hierarchical Structure
```
🏠 Warehouses
├── 🚪 Rooms
│   ├── 📦 Containers/Shelves
│   │   └── 📱 Items
│   └── 🗑️ Trash
│       └── ♻️ Disposed Items
```

### 🔐 Privacy System
```
Public Warehouse (Visible to all users)
├── Private Room (Master/Admin only)
│   ├── Private Container (Inherits privacy)
│   └── Public Container (Explicitly public)
└── Public Room (Visible to all)
    └── Private Container (Creator + Master/Admin only)
```

## 🧠 Application Logic

### 1️⃣ **First Launch**
- New user onboarding with username setup
- Automatic device ID generation
- Welcome screen with feature introduction

### 2️⃣ **Structure Creation**
- Create warehouses with public/private visibility
- Organize rooms and containers within warehouses
- Set appropriate access levels for different areas

### 3️⃣ **Item Management**
- Add items with detailed metadata (category, expiry, price, etc.)
- Choose public/private visibility per item
- Track ownership and modification history

### 4️⃣ **Collaboration**
- Invite users with appropriate role assignments
- Real-time synchronization across devices
- Conflict resolution with role-based priority

## 🔒 Security & Privacy

### 🛡️ **Offline-First Security**
- **Local storage**: All data in browser localStorage/device storage
- **No external servers**: Core functionality works completely offline
- **P2P encryption**: Direct encrypted communication between devices
- **Role hierarchy**: Strict access control based on user roles

### 🔐 **Data Protection**
- **Device ID**: Unique cryptographic device identification
- **Permission inheritance**: Smart public/private data handling
- **Audit trail**: Complete change history with authorship
- **Zero external transmission**: Core data never leaves your network

### 🚫 **What stays private**
- Warehouse and room structure
- Item lists and inventory details
- User data and role assignments
- Change history and audit logs
- Trash and disposal records

### ✅ **Optional external services**
- **AI Assistant**: Claude/OpenAI API (only if you provide API key)
- **Local LLM**: Connect to local AI models (LM Studio, etc.)

## 🧪 Testing & Validation

### 🔬 **Built-in Self-Test**
1. Click the **TestTube** button (purple) in the interface
2. Select **"P2P & Family Scenarios"** test module
3. Run comprehensive automated tests
4. Review results for all system components

### 🌐 **Interactive Demo**
Open [`/public/p2pDemo.html`](./public/p2pDemo.html) for live system simulation

### 📋 **Test Coverage**
- ✅ Device Identity & User Profiles
- ✅ Role Assignment & Permission System
- ✅ Public/Private Visibility Rules
- ✅ Conflict Resolution Algorithms
- ✅ Sync Batching & Network Protocol
- ✅ Trash Management & Recovery
- ✅ User Management System
- ✅ Multi-user Collaboration Scenarios

## 🎮 Use Cases

### 🏢 **Office/Team Environment**
```
1. Administrator creates "Office Inventory" warehouse
2. Creates private "Server Room" for sensitive equipment
3. Invites team members as Editors for general areas
4. Tracks equipment, supplies, and shared resources
5. Maintains security for confidential items
```

### 🏠 **Personal/Household Management**
```
1. Create "Home" warehouse with room organization
2. Set private areas for personal items
3. Share public areas for family collaboration
4. Track expiry dates for food and medications
5. Manage household supplies and equipment
```

### 🏪 **Small Business Inventory**
```
1. Business owner manages main inventory as Master
2. Employees have Editor access to their departments
3. Customers/partners get Guest access to public catalogs
4. Track sales, restocking, and equipment maintenance
```

### 🤝 **Community/Shared Spaces**
```
1. Community center creates shared tool library
2. Members get Viewer/Editor access to relevant sections
3. Track borrowed items and maintenance schedules
4. Maintain private administrative areas
```

## 🛠️ Build & Deploy

### 📦 **Web Build**
```bash
npm run build       # Build to dist/ folder
npm run preview     # Preview build locally
```

### 📱 **Mobile Build**
```bash
# Android
npm run build && npx cap copy android && npx cap open android

# iOS
npm run build && npx cap copy ios && npx cap open ios
```

### 🐳 **Docker Deploy**
```bash
docker build -f docker/Dockerfile -t inventory-os .
docker run -p 3001:3001 -p 8080:8080 inventory-os
```

## 🚀 Advanced Features

### 🤖 **AI Assistant (SMARTIE)**
- **Claude Integration**: Natural language inventory management
- **Local LLM Support**: Privacy-focused AI with local models
- **Smart Suggestions**: Automated categorization and organization
- **Voice Commands**: Natural language item operations

### 📊 **Import/Export System**
- **JSON Export**: Complete data backup functionality
- **Smart Import**: Intelligent conflict resolution
- **Batch Operations**: Bulk item management
- **Migration Tools**: Easy data transfer between systems

### 🎨 **Customization**
- **Multiple Themes**: Dark/light modes with color schemes
- **Localization**: Multi-language support
- **Currency Support**: Global currency formatting
- **Custom Fields**: Extensible item metadata

## 📚 Technical Documentation

### 🏗️ **Architecture**
- **Frontend**: React 18 + TypeScript + Vite
- **Storage**: localStorage + IndexedDB for offline functionality
- **Networking**: Custom P2P protocol with WebRTC
- **Security**: Role-based access control (RBAC)

### 📁 **Project Structure**
```
inventory-os/
├── components/          # React UI components
│   ├── WelcomeScreen.tsx       # User onboarding
│   ├── UserManagementModal.tsx # Role management
│   ├── TrashModal.tsx          # Disposal system
│   └── P2PTestRunner.tsx       # Network testing
├── services/           # Business logic layer
│   ├── deviceIdentityService.ts    # Device management
│   ├── rolesPermissionService.ts   # Access control
│   ├── syncBatchService.ts         # P2P synchronization
│   └── trashService.ts             # Disposal system
└── tests/              # Automated test suites
```

## 🤝 Support & Documentation

### 📖 **Additional Documentation**
- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Privacy Policy](./PRIVACY_POLICY.md) - Privacy and data protection

### 🐛 **Issues & Feedback**
- GitHub Issues: [Report issues](https://github.com/BlackBadHope/inventory-os/issues)
- Built-in Diagnostics: Use self-test feature for troubleshooting

### 🔄 **Updates**
Automatic update checking with notification system for new versions.

---

## 🎯 Getting Started

1. **Install** the application (web/mobile/desktop)
2. **Complete** the welcome screen setup with your username
3. **Create** your first warehouse with appropriate privacy settings
4. **Invite** team members with suitable role assignments
5. **Test** P2P functionality using the built-in test suite
6. **Configure** privacy settings for your items and areas
7. **Explore** the disposal system for item lifecycle management

**Ready to organize your world!** 🚀

---

*Inventory OS v2.6 - Professional inventory management with complete offline privacy and P2P collaboration.*