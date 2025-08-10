import { useState } from 'react';
import { Globe, Check, AlertTriangle } from 'lucide-react';
import localizationService from '../services/localizationService';

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(localizationService.getCurrentLocale());
  
  const locales = localizationService.getAvailableLocales();
  const currentLocaleConfig = locales.find(l => l.code === currentLocale);
  const blockedMessage = localizationService.getBlockedCurrencyMessage();

  const handleLocaleChange = (localeCode: string) => {
    if (localizationService.setLocale(localeCode)) {
      setCurrentLocale(localeCode);
      setIsOpen(false);
      
      // Перезагружаем страницу для применения локализации
      window.location.reload();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Current language button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Change language"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-lg">{currentLocaleConfig?.flag}</span>
        <span className="text-sm font-medium">{currentLocaleConfig?.name}</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
          {/* Warning for blocked currencies */}
          {blockedMessage && (
            <div className="p-3 border-b bg-yellow-50">
              <div className="flex items-start gap-2 text-xs text-yellow-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-600" />
                <span>{blockedMessage}</span>
              </div>
            </div>
          )}

          {/* Language options */}
          <div className="py-1">
            {locales.filter(locale => locale.code !== 'ru').map((locale) => {
              const isSelected = locale.code === currentLocale;
              
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleChange(locale.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-lg">{locale.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{locale.name}</div>
                    <div className="text-xs text-gray-500">
                      {locale.currencies.join(', ')}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="border-t p-2 bg-gray-50 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Auto-detected: {localizationService.getCurrentFlag()}</span>
              <span>Country: {localizationService.getUserCountry()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}