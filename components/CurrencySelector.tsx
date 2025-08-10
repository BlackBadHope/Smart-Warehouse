import React, { useState, useEffect } from 'react';
import { DollarSign, Check } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import debugService from '../services/debugService';

interface CurrencySelectorProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  className?: string;
}

const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' }
];

export default function CurrencySelector({ currentCurrency, onCurrencyChange, className = '' }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentCurrencyConfig = AVAILABLE_CURRENCIES.find(c => c.code === currentCurrency);

  const handleCurrencyChange = (currencyCode: string) => {
    debugService.action('CurrencySelector: Changing currency', { from: currentCurrency, to: currencyCode });
    onCurrencyChange(currencyCode);
    setIsOpen(false);
    debugService.info('CurrencySelector: Currency changed successfully', { newCurrency: currencyCode });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.buttonHoverBg} focus:outline-none focus:ring-2 focus:ring-yellow-500`}
        title="Change currency"
      >
        <DollarSign className={`w-4 h-4 ${ASCII_COLORS.accent}`} />
        <span className={`text-sm font-medium ${ASCII_COLORS.text}`}>
          {currentCurrencyConfig?.symbol} {currentCurrency}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-1 right-0 ${ASCII_COLORS.modalBg} border ${ASCII_COLORS.border} rounded-lg shadow-lg z-50 min-w-48 max-w-xs`}>
          <div className="py-1 max-h-64 overflow-y-auto">
            {AVAILABLE_CURRENCIES.map((currency) => {
              const isSelected = currency.code === currentCurrency;
              
              return (
                <button
                  key={currency.code}
                  onClick={() => handleCurrencyChange(currency.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${ASCII_COLORS.buttonHoverBg} focus:outline-none ${
                    isSelected ? `${ASCII_COLORS.accent} bg-yellow-600 bg-opacity-20` : `${ASCII_COLORS.text} hover:bg-gray-700`
                  }`}
                >
                  <span className="text-lg font-mono">{currency.symbol}</span>
                  <div className="flex-1">
                    <div className="font-medium">{currency.code}</div>
                    <div className={`text-xs ${ASCII_COLORS.text} opacity-70`}>
                      {currency.name}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className={`w-4 h-4 ${ASCII_COLORS.accent}`} />
                  )}
                </button>
              );
            })}
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