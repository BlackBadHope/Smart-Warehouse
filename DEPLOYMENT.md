# 🚀 Deployment Guide - Inventory OS Home Edition

## 📋 Overview

Inventory OS Home Edition может быть развернут на различных платформах:
- **PWA** - веб-приложение (работает везде)
- **Android** - через Capacitor
- **iOS** - через Capacitor  
- **Windows/macOS/Linux** - через Electron
- **Docker** - контейнеризованное развертывание
- **Server** - Node.js сервер

## 🌐 PWA Deployment (Рекомендуется)

### Vercel (Бесплатно)
```bash
# 1. Установить Vercel CLI
npm i -g vercel

# 2. Деплоймент
npm run build
vercel --prod
```

### Netlify (Бесплатно)
```bash
# 1. Установить Netlify CLI
npm i -g netlify-cli

# 2. Деплоймент
npm run build
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
# 1. Установить gh-pages
npm i -D gh-pages

# 2. Добавить в package.json
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# 3. Деплоймент
npm run deploy
```

## 📱 Mobile Apps

### Android (Google Play)

```bash
# 1. Установить Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Инициализация
npx cap init

# 3. Добавить Android платформу
npx cap add android

# 4. Сборка
npm run build
npx cap copy android
npx cap sync android

# 5. Открыть в Android Studio
npx cap open android
```

**Настройка для публикации:**
1. Создать ключ подписи: `keytool -genkey -v -keystore my-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias`
2. Настроить `android/app/build.gradle`
3. Собрать APK: `./gradlew assembleRelease`

### iOS (App Store)

```bash
# 1. Добавить iOS платформу
npx cap add ios

# 2. Сборка
npm run build
npx cap copy ios
npx cap sync ios

# 3. Открыть в Xcode
npx cap open ios
```

## 💻 Desktop Apps

### Electron

```bash
# 1. Установить Electron
npm install electron electron-builder --save-dev

# 2. Добавить в package.json
"scripts": {
  "electron": "electron electron.config.js",
  "electron:build": "npm run build && electron-builder"
}

# 3. Сборка
npm run build
npm run electron:build
```

### Windows Installer
```bash
# Создать .exe установщик
electron-builder --win
```

### macOS App
```bash
# Создать .dmg для macOS
electron-builder --mac
```

### Linux AppImage
```bash
# Создать AppImage для Linux
electron-builder --linux
```

## 🐳 Docker Deployment

### Локальный Docker
```bash
# 1. Собрать образ
docker build -f docker/Dockerfile -t inventory-os-home .

# 2. Запустить
docker run -p 3001:3001 -p 8080:8080 -v $(pwd)/data:/app/data inventory-os-home
```

### Docker Compose
```bash
# 1. Запуск всех сервисов
docker-compose -f docker/docker-compose.yml up -d

# 2. Остановка
docker-compose -f docker/docker-compose.yml down

# 3. С backup и proxy
docker-compose -f docker/docker-compose.yml --profile backup --profile proxy up -d
```

### Docker Swarm (Кластер)
```bash
# 1. Инициализация Swarm
docker swarm init

# 2. Деплоймент стека
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