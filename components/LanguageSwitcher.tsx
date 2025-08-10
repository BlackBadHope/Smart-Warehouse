import { useState } from 'react';
import { Globe, Check, AlertTriangle } from 'lucide-react';
import localizationService from '../services/localizationService';
import { ASCII_COLORS } from '../constants';
import debugService from '../services/debugService';

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
    debugService.action('LanguageSwitcher: Changing locale', { from: currentLocale, to: localeCode });
    if (localizationService.setLocale(localeCode)) {
      setCurrentLocale(localeCode);
      setIsOpen(false);
      debugService.info('LanguageSwitcher: Locale changed successfully, reloading page');
      
      // Перезагружаем страницу для применения локализации
      window.location.reload();
    } else {
      debugService.error('LanguageSwitcher: Failed to change locale', { localeCode });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Current language button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.buttonHoverBg} focus:outline-none focus:ring-2 focus:ring-yellow-500`}
        title="Change language"
      >
        <Globe className={`w-4 h-4 ${ASCII_COLORS.accent}`} />
        <span className="text-base sm:text-lg">{currentLocaleConfig?.flag}</span>
        <span className={`text-xs sm:text-sm font-medium ${ASCII_COLORS.text} hidden sm:block`}>{currentLocaleConfig?.name}</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute top-full mt-1 right-0 ${ASCII_COLORS.modalBg} border ${ASCII_COLORS.border} rounded-lg shadow-lg z-50 min-w-48 max-w-xs sm:max-w-sm`}>
          {/* Warning for blocked currencies */}
          {blockedMessage && (
            <div className="p-3 border-b border-yellow-600 bg-yellow-900 bg-opacity-20">
              <div className={`flex items-start gap-2 text-xs ${ASCII_COLORS.accent}`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-400" />
                <span>{blockedMessage}</span>
              </div>
            </div>
          )}

          {/* Language options */}
          <div className="py-1">
            {locales.map((locale) => {
              const isSelected = locale.code === currentLocale;
              
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleChange(locale.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${ASCII_COLORS.buttonHoverBg} focus:outline-none ${
                    isSelected ? `${ASCII_COLORS.accent} bg-yellow-600 bg-opacity-20` : `${ASCII_COLORS.text} hover:bg-gray-700`
                  }`}
                >
                  <span className="text-lg">{locale.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{locale.name}</div>
                    <div className={`text-xs ${ASCII_COLORS.text} opacity-70`}>
                      {locale.currencies.join(', ')}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className={`w-4 h-4 ${ASCII_COLORS.accent}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer info */}
          <div className={`border-t ${ASCII_COLORS.border} p-2 bg-gray-800 text-xs ${ASCII_COLORS.text} opacity-70`}>
            <div className="flex items-center justify-between text-xs">
              <span>Auto: {localizationService.getCurrentFlag()}</span>
              <span>{localizationService.getUserCountry()}</span>
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