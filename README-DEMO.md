# 📦 Inventory OS - Demo Version

> 🌟 **Демонстрационная версия** современной системы управления складом с поддержкой ИИ

## 🚀 Возможности Demo версии

### 📋 Основные функции
- ✅ Управление складами, комнатами и контейнерами
- ✅ Добавление и поиск товаров с метаданными
- ✅ Bucket система для временного хранения
- ✅ Визуальный интерфейс с темами оформления
- ✅ Импорт/экспорт данных (JSON)
- ✅ Многоязычная поддержка (RU/EN/UA/PL)
- ✅ Мультивалютность (USD/EUR/UAH/RUB/PLN)

### 🤖 Универсальный SMARTIE AI
**Поддерживаемые провайдеры:**
- 🧠 **Claude (Anthropic)** - Самый умный для сложных задач  
- 🤖 **ChatGPT (OpenAI)** - Популярный и быстрый
- 💎 **Gemini (Google)** - Быстрый и бесплатный  
- 🏠 **Local LLM** - Ваш локальный сервер

**SMARTIE умеет:**
- Создавать склады и структуры одной командой
- Добавлять товары с автоматическими метаданными
- Выполнять несколько команд одновременно
- Отвечать на вопросы о складе
- Показывать статистику и аналитику

### 💬 Примеры команд для SMARTIE
```
"создай склад Главный"
"добавь 10 кг картошки в овощной отдел" 
"найди все яблоки"
"покажи сводку по складу"
"перенеси молоко из bucket в холодильник"
```

## 🎯 Что НЕ включено в Demo

**Для полной версии (main ветка):**
- 🔧 Система отладки и диагностики
- 🧪 Комплексное тестирование (Self-Test Suite)
- 📡 P2P сеть и синхронизация устройств
- 🏠 Локальный сервер (server.js)
- 💬 Социальный чат между устройствами
- 📱 APK сборка для мобильных устройств

## 🛠 Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
```

## 🔑 Настройка AI

1. Откройте SMARTIE чат (🧠 кнопка)
2. Выберите нужного провайдера
3. Введите API ключ:
   - **Claude**: [console.anthropic.com](https://console.anthropic.com/)
   - **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)  
   - **Gemini**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - **Local**: Укажите URL вашего сервера

## 🌐 Деплой на Vercel

Эта ветка оптимизирована для деплоя на Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo%2Finventory-os)

## 🔒 Безопасность

- 🔐 API ключи сохраняются локально в браузере
- 🚫 Никакие данные не передаются третьим лицам
- 💾 Все данные хранятся в localStorage браузера

## 📱 Техническая информация

- **Frontend**: React + TypeScript + Vite
- **AI Integration**: Anthropic Claude, OpenAI, Google Gemini
- **Storage**: LocalStorage (браузер)
- **Styling**: Tailwind CSS с темами
- **Icons**: Lucide React

## 🔗 Полная версия

Для полной функциональности с P2P сетью, тестами и мобильным приложением переключитесь на `main` ветку:

```bash
git checkout main
npm install
npm run dev
```

---

💡 **Лицензия**: MIT | 🤖 **AI Powered by**: Claude, ChatGPT, Gemini