# 🚀 Deployment Guide - Inventory OS

## 📋 Overview

Inventory OS can be deployed across multiple platforms:
- **PWA** - Progressive Web App (works everywhere)
- **Android** - via Capacitor
- **iOS** - via Capacitor  
- **Windows/macOS/Linux** - via Electron
- **Docker** - containerized deployment
- **Server** - Node.js server

## 🌐 PWA Deployment (Recommended)

### Vercel (Free)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
npm run build
vercel --prod
```

### Netlify (Free)
```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Deploy
npm run build
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
# 1. Install gh-pages
npm i -D gh-pages

# 2. Add to package.json
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# 3. Deploy
npm run deploy
```

## 📱 Mobile Apps

### Android (Google Play)

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize
npx cap init

# 3. Add Android platform
npx cap add android

# 4. Build
npm run build
npx cap copy android
npx cap sync android

# 5. Open in Android Studio
npx cap open android
```

**Release configuration:**
1. Create signing key: `keytool -genkey -v -keystore my-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias`
2. Configure `android/app/build.gradle`
3. Build APK: `./gradlew assembleRelease`

### iOS (App Store)

```bash
# 1. Add iOS platform
npx cap add ios

# 2. Build
npm run build
npx cap copy ios
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

## 💻 Desktop Apps

### Electron

```bash
# 1. Install Electron
npm install electron electron-builder --save-dev

# 2. Add to package.json
"scripts": {
  "electron": "electron electron.config.js",
  "electron:build": "npm run build && electron-builder"
}

# 3. Build
npm run build
npm run electron:build
```

### Windows Installer
```bash
# Create .exe installer
electron-builder --win
```

### macOS App
```bash
# Create .dmg for macOS
electron-builder --mac
```

### Linux AppImage
```bash
# Create AppImage for Linux
electron-builder --linux
```

## 🐳 Docker Deployment

### Local Docker
```bash
# 1. Build image
docker build -f docker/Dockerfile -t inventory-os .

# 2. Run
docker run -p 3001:3001 -p 8080:8080 -v $(pwd)/data:/app/data inventory-os
```

### Docker Compose
```bash
# 1. Start all services
docker-compose -f docker/docker-compose.yml up -d

# 2. Stop
docker-compose -f docker/docker-compose.yml down

# 3. With backup and proxy
docker-compose -f docker/docker-compose.yml --profile backup --profile proxy up -d
```

### Docker Swarm (Cluster)
```bash
# 1. Initialize Swarm
docker swarm init

# 2. Deploy stack
docker stack deploy -c docker/docker-compose.yml inventory
```

## 🖥️ Server Deployment

### Linux VPS/Dedicated Server

```bash
# 1. Подготовка сервера (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm nginx certbot python3-certbot-nginx -y

# 2. Клонирование и установка
git clone https://github.com/yourusername/inventory-os.git
cd inventory-os
npm install --production

# 3. Создание systemd сервиса
sudo nano /etc/systemd/system/inventory-os.service
```

**Systemd service file:**
```ini
[Unit]
Description=Inventory OS Home Server
After=network.target

[Service]
Type=simple
User=inventory
WorkingDirectory=/home/inventory/inventory-os
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# 4. Запуск сервиса
sudo systemctl enable inventory-os
sudo systemctl start inventory-os

# 5. Nginx конфигурация
sudo nano /etc/nginx/sites-available/inventory-os
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 6. Активация сайта и SSL
sudo ln -s /etc/nginx/sites-available/inventory-os /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

### Windows Server

```powershell
# 1. Установка Node.js и создание сервиса
# Скачать и установить Node.js
# Установить node-windows для сервиса
npm install -g node-windows

# 2. Создание Windows Service
node-windows-service.js
```

## 🏠 Home Network Setup

### Raspberry Pi (Рекомендуется для дома)

```bash
# 1. Подготовка Raspberry Pi OS
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm git -y

# 2. Клонирование проекта
git clone https://github.com/yourusername/inventory-os.git
cd inventory-os
npm install --production

# 3. Автозапуск через PM2
npm install -g pm2
pm2 start server.js --name inventory-os
pm2 startup
pm2 save

# 4. Настройка статического IP
sudo nano /etc/dhcpcd.conf
# Добавить:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8
```

## 📊 Monitoring & Analytics

### Простой мониторинг
```bash
# 1. Установка Prometheus Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar -xf node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

## 🔧 Environment Variables

Создать `.env` файл:
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
WS_PORT=8080

# Database
DB_PATH=./data/inventory.db

# Security
RATE_LIMIT_MAX=100
SESSION_TIMEOUT=7200

# Features
AUTO_BACKUP=true
BACKUP_INTERVAL=24h
MAX_BACKUPS=7

# Network
ENABLE_MDNS=true
ENABLE_CORS=true
ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/inventory-os.log
```

## 🚀 Quick Deploy Script

```bash
#!/bin/bash
# quick-deploy.sh

echo "🚀 Deploying Inventory OS Home Edition..."

# Choice menu
echo "Select deployment target:"
echo "1) PWA (Vercel)"
echo "2) Android APK"
echo "3) Desktop (Electron)"
echo "4) Docker"
echo "5) Local Server"

read -p "Enter choice [1-5]: " choice

case $choice in
  1)
    npm run build
    vercel --prod
    ;;
  2)
    npm run build
    npx cap copy android
    npx cap open android
    ;;
  3)
    npm run build
    npm run electron:build
    ;;
  4)
    docker-compose -f docker/docker-compose.yml up -d
    ;;
  5)
    npm run start:home
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo "✅ Deployment complete!"
```

## 📈 Production Checklist

- [ ] Backup стратегия настроена
- [ ] SSL сертификаты установлены
- [ ] Мониторинг работает
- [ ] Логирование настроено
- [ ] Firewall правила настроены
- [ ] Auto-updates включены
- [ ] Health checks работают
- [ ] Performance оптимизирован
- [ ] Security headers установлены
- [ ] Rate limiting включен

## 🆘 Troubleshooting

### Проблемы с портами
```bash
# Проверить занятые порты
netstat -tulpn | grep :3001
lsof -i :3001

# Убить процесс
kill -9 <PID>
```

### Проблемы с правами
```bash
# Изменить владельца
sudo chown -R inventory:inventory /path/to/app

# Правильные права
chmod 755 server.js
chmod -R 644 dist/
```

### Database issues
```bash
# Проверить SQLite
sqlite3 data/inventory.db ".tables"
sqlite3 data/inventory.db ".schema"

# Backup базы
cp data/inventory.db backup-$(date +%Y%m%d).db
```

---
💡 **Совет:** Для максимальной совместимости рекомендуется PWA деплоймент. Он работает на всех устройствах и автоматически обновляется!