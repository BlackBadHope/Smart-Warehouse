interface LocaleConfig {
  code: string;
  name: string;
  currencies: string[];
  excludedCurrencies?: string[];
  dateFormat: string;
  numberFormat: string;
  flag: string;
}

interface Translations {
  [key: string]: {
    [locale: string]: string;
  };
}

class LocalizationService {
  private currentLocale: string;
  private locales: LocaleConfig[] = [
    {
      code: 'uk',
      name: 'Українська',
      currencies: ['USD', 'EUR', 'UAH'],
      excludedCurrencies: ['RUB'], // Исключаем рубли для Украины
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'uk-UA',
      flag: '🇺🇦'
    },
    {
      code: 'ru',
      name: 'Русский',
      currencies: ['RUB', 'USD', 'EUR'],
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'ru-RU',
      flag: '🇷🇺'
    },
    {
      code: 'en',
      name: 'English',
      currencies: ['USD', 'EUR', 'GBP'],
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      flag: '🇺🇸'
    },
    {
      code: 'de',
      name: 'Deutsch',
      currencies: ['EUR', 'USD'],
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'de-DE',
      flag: '🇩🇪'
    },
    {
      code: 'pl',
      name: 'Polski',
      currencies: ['PLN', 'EUR', 'USD'],
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'pl-PL',
      flag: '🇵🇱'
    }
  ];

  private translations: Translations = {
    // Navigation
    'nav.warehouses': {
      'uk': 'СКЛАДИ',
      'ru': 'СКЛАДЫ', 
      'en': 'WAREHOUSES',
      'de': 'LAGER',
      'pl': 'MAGAZYNY'
    },
    'nav.rooms': {
      'uk': 'КІМНАТИ',
      'ru': 'КОМНАТЫ',
      'en': 'ROOMS', 
      'de': 'RÄUME',
      'pl': 'POKOJE'
    },
    'nav.containers': {
      'uk': 'КОНТЕЙНЕРИ',
      'ru': 'КОНТЕЙНЕРЫ',
      'en': 'CONTAINERS',
      'de': 'BEHÄLTER', 
      'pl': 'KONTENERY'
    },
    'nav.items': {
      'uk': 'ТОВАРИ',
      'ru': 'ТОВАРЫ',
      'en': 'ITEMS',
      'de': 'ARTIKEL',
      'pl': 'PRZEDMIOTY'
    },
    'nav.bucket': {
      'uk': 'КОШИК',
      'ru': 'КОРЗИНА',
      'en': 'BUCKET',
      'de': 'KORB',
      'pl': 'KOSZYK'
    },

    // Actions
    'action.add': {
      'uk': 'Додати',
      'ru': 'Добавить',
      'en': 'Add',
      'de': 'Hinzufügen',
      'pl': 'Dodaj'
    },
    'action.edit': {
      'uk': 'Редагувати',
      'ru': 'Редактировать',
      'en': 'Edit',
      'de': 'Bearbeiten',
      'pl': 'Edytuj'
    },
    'action.delete': {
      'uk': 'Видалити',
      'ru': 'Удалить',
      'en': 'Delete',
      'de': 'Löschen',
      'pl': 'Usuń'
    },
    'action.save': {
      'uk': 'Зберегти',
      'ru': 'Сохранить',
      'en': 'Save',
      'de': 'Speichern',
      'pl': 'Zapisz'
    },
    'action.cancel': {
      'uk': 'Скасувати',
      'ru': 'Отмена',
      'en': 'Cancel',
      'de': 'Abbrechen',
      'pl': 'Anuluj'
    },

    // Licenses
    'license.free': {
      'uk': 'Безкоштовна версія',
      'ru': 'Бесплатная версия',
      'en': 'Free Version',
      'de': 'Kostenlose Version',
      'pl': 'Darmowa wersja'
    },
    'license.pro': {
      'uk': 'Pro версія',
      'ru': 'Pro версия',
      'en': 'Pro Version',
      'de': 'Pro Version',
      'pl': 'Wersja Pro'
    },
    'license.upgrade': {
      'uk': 'Оновити до Pro',
      'ru': 'Обновить до Pro',
      'en': 'Upgrade to Pro',
      'de': 'Auf Pro upgraden',
      'pl': 'Uaktualnij do Pro'
    },

    // Payment
    'payment.price': {
      'uk': 'Ціна',
      'ru': 'Цена',
      'en': 'Price',
      'de': 'Preis',
      'pl': 'Cena'
    },
    'payment.buy': {
      'uk': 'Купити',
      'ru': 'Купить',
      'en': 'Buy',
      'de': 'Kaufen',
      'pl': 'Kup'
    },
    'payment.processing': {
      'uk': 'Обробка платежу...',
      'ru': 'Обработка платежа...',
      'en': 'Processing payment...',
      'de': 'Zahlung wird verarbeitet...',
      'pl': 'Przetwarzanie płatności...'
    },

    // Units
    'unit.pcs': {
      'uk': 'шт',
      'ru': 'шт',
      'en': 'pcs',
      'de': 'Stk',
      'pl': 'szt'
    },
    'unit.kg': {
      'uk': 'кг',
      'ru': 'кг',
      'en': 'kg',
      'de': 'kg',
      'pl': 'kg'
    },
    'unit.l': {
      'uk': 'л',
      'ru': 'л',
      'en': 'l',
      'de': 'l',
      'pl': 'l'
    },

    // Messages
    'msg.success': {
      'uk': 'Успішно!',
      'ru': 'Успешно!',
      'en': 'Success!',
      'de': 'Erfolgreich!',
      'pl': 'Sukces!'
    },
    'msg.error': {
      'uk': 'Помилка',
      'ru': 'Ошибка',
      'en': 'Error',
      'de': 'Fehler',
      'pl': 'Błąd'
    },

    // War-related messages for Ukraine
    'msg.no_rub_ua': {
      'uk': '🇺🇦 Рублі недоступні через стан війни з росією',
      'ru': 'Рубли недоступны в данном регионе',
      'en': 'RUB currency not available in this region',
      'de': 'RUB Währung in dieser Region nicht verfügbar',
      'pl': 'RUB waluta niedostępna w tym regionie'
    },

    // User
    'user.name': {
      'uk': 'Користувач',
      'ru': 'Пользователь',
      'en': 'User',
      'de': 'Benutzer',
      'pl': 'Użytkownik'
    },

    // UI Text
    'ui.select_warehouse': {
      'uk': 'Виберіть склад',
      'ru': 'Выберите склад',
      'en': 'Select a Warehouse',
      'de': 'Lager auswählen',
      'pl': 'Wybierz magazyn'
    },
    'ui.select_room': {
      'uk': 'Виберіть кімнату',
      'ru': 'Выберите комнату',
      'en': 'Select Room',
      'de': 'Raum auswählen',
      'pl': 'Wybierz pokój'
    },
    'ui.select_container': {
      'uk': 'Виберіть контейнер',
      'ru': 'Выберите контейнер',
      'en': 'Select Container',
      'de': 'Behälter auswählen',
      'pl': 'Wybierz kontener'
    },
    'ui.staging_area': {
      'uk': 'Область підготовки',
      'ru': 'Область подготовки',
      'en': 'Staging Area',
      'de': 'Bereitstellungsbereich',
      'pl': 'Obszar przygotowania'
    },

    // P2P Network & QR Connections
    'p2p.title': {
      'uk': 'QR P2P З\'єднання',
      'ru': 'QR P2P Подключение',
      'en': 'QR P2P Connection',
      'de': 'QR P2P Verbindung',
      'pl': 'Połączenie QR P2P'
    },
    'p2p.create_qr': {
      'uk': 'Створити QR',
      'ru': 'Создать QR',
      'en': 'Create QR',
      'de': 'QR erstellen',
      'pl': 'Utwórz QR'
    },
    'p2p.connect': {
      'uk': 'Підключитися',
      'ru': 'Подключиться',
      'en': 'Connect',
      'de': 'Verbinden',
      'pl': 'Połącz'
    },
    'p2p.copy_data': {
      'uk': 'Копіювати дані',
      'ru': 'Копировать данные',
      'en': 'Copy Data',
      'de': 'Daten kopieren',
      'pl': 'Kopiuj dane'
    },
    'p2p.connect_device': {
      'uk': 'Підключити пристрій',
      'ru': 'Подключить устройство',
      'en': 'Connect Device',
      'de': 'Gerät verbinden',
      'pl': 'Podłącz urządzenie'
    },
    'p2p.connection_desc': {
      'uk': 'Підключення пристроїв через QR коди',
      'ru': 'Подключение устройств через QR коды',
      'en': 'Connect devices via QR codes',
      'de': 'Geräte über QR-Codes verbinden',
      'pl': 'Łączenie urządzeń przez kody QR'
    },
    'p2p.paste_prompt': {
      'uk': 'Вставте сюди JSON дані з QR коду...',
      'ru': 'Вставьте сюда JSON данные из QR кода...',
      'en': 'Paste JSON data from QR code here...',
      'de': 'JSON-Daten vom QR-Code hier einfügen...',
      'pl': 'Wklej tutaj dane JSON z kodu QR...'
    },
    'p2p.creating': {
      'uk': 'Створення...',
      'ru': 'Создание...',
      'en': 'Creating...',
      'de': 'Erstellen...',
      'pl': 'Tworzenie...'
    },
    'p2p.connecting': {
      'uk': '🔄 Підключаємося...',
      'ru': '🔄 Подключаемся...',
      'en': '🔄 Connecting...',
      'de': '🔄 Verbinden...',
      'pl': '🔄 Łączenie...'
    },
    'p2p.copied': {
      'uk': 'Скопійовано!',
      'ru': 'Скопировано!',
      'en': 'Copied!',
      'de': 'Kopiert!',
      'pl': 'Skopiowane!'
    }
  };

  constructor() {
    // Определяем локаль по браузеру или IP
    this.currentLocale = this.detectLocale();
    this.saveLocalePreference();
  }

  private detectLocale(): string {
    // Загружаем сохраненную локаль
    const saved = localStorage.getItem('app-locale');
    if (saved && this.locales.find(l => l.code === saved)) {
      return saved;
    }

    // Определяем по браузеру
    const browserLang = navigator.language.toLowerCase();
    
    // Проверяем точное совпадение
    if (browserLang.startsWith('uk')) return 'uk';
    if (browserLang.startsWith('ru')) return 'ru';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('pl')) return 'pl';
    
    // Определяем по IP/часовому поясу (приблизительно)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Kiev') || timezone.includes('Europe/Kiev')) return 'uk';
    if (timezone.includes('Moscow') || timezone.includes('Europe/Moscow')) return 'ru';
    if (timezone.includes('Berlin') || timezone.includes('Europe/Berlin')) return 'de';
    if (timezone.includes('Warsaw') || timezone.includes('Europe/Warsaw')) return 'pl';

    // По умолчанию английский
    return 'en';
  }

  private saveLocalePreference(): void {
    localStorage.setItem('app-locale', this.currentLocale);
  }

  // Public API
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  setLocale(localeCode: string): boolean {
    if (this.locales.find(l => l.code === localeCode)) {
      this.currentLocale = localeCode;
      this.saveLocalePreference();
      return true;
    }
    return false;
  }

  getAvailableLocales(): LocaleConfig[] {
    return [...this.locales];
  }

  translate(key: string, params?: Record<string, string>): string {
    const translation = this.translations[key]?.[this.currentLocale] 
                       || this.translations[key]?.['en'] 
                       || key;

    if (params) {
      return Object.entries(params).reduce(
        (str, [param, value]) => str.replace(`{{${param}}}`, value),
        translation
      );
    }

    return translation;
  }

  // Shorthand
  t = this.translate.bind(this);

  getAvailableCurrencies(): string[] {
    const locale = this.locales.find(l => l.code === this.currentLocale);
    if (!locale) return ['USD', 'EUR'];

    let currencies = [...locale.currencies];
    
    // Исключаем валюты если они запрещены для этой локали
    if (locale.excludedCurrencies) {
      currencies = currencies.filter(c => !locale.excludedCurrencies!.includes(c));
    }

    return currencies;
  }

  formatPrice(amount: number, currency: string): string {
    const locale = this.locales.find(l => l.code === this.currentLocale);
    const numberFormat = locale?.numberFormat || 'en-US';

    try {
      return new Intl.NumberFormat(numberFormat, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      return `${amount} ${currency}`;
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = this.locales.find(l => l.code === this.currentLocale);
    const numberFormat = locale?.numberFormat || 'en-US';

    try {
      return dateObj.toLocaleDateString(numberFormat);
    } catch (error) {
      return dateObj.toLocaleDateString();
    }
  }

  getCurrentLocaleConfig(): LocaleConfig | undefined {
    return this.locales.find(l => l.code === this.currentLocale);
  }

  isRussianCurrencyBlocked(): boolean {
    const locale = this.getCurrentLocaleConfig();
    return locale?.excludedCurrencies?.includes('RUB') || false;
  }

  getBlockedCurrencyMessage(): string {
    if (this.currentLocale === 'uk' && this.isRussianCurrencyBlocked()) {
      return this.translate('msg.no_rub_ua');
    }
    return '';
  }

  // Определение страны пользователя для аналитики
  getUserCountry(): string {
    switch (this.currentLocale) {
      case 'uk': return 'UA';
      case 'ru': return 'RU';
      case 'de': return 'DE';
      case 'pl': return 'PL';
      default: return 'US';
    }
  }

  // Получить флаг для UI
  getCurrentFlag(): string {
    const locale = this.getCurrentLocaleConfig();
    return locale?.flag || '🌍';
  }
}

// Singleton instance
export const localizationService = new LocalizationService();
export default localizationService;