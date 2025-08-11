import React, { useState } from 'react';
import { Server, Wifi, Users, Database, Shield, Zap, Home } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface Props {
  show: boolean;
  onComplete: (mode: 'master' | 'client') => void;
}

const ModeSetupModal: React.FC<Props> = ({ show, onComplete }) => {
  const [selectedMode, setSelectedMode] = useState<'master' | 'client' | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!show) return null;

  const handleModeSelect = (mode: 'master' | 'client') => {
    setSelectedMode(mode);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedMode) {
      console.log('ModeSetupModal: Confirming mode:', selectedMode);
      alert(`DEBUG: Saving mode to localStorage: ${selectedMode}`);
      localStorage.setItem('inventory-os-mode', selectedMode);
      console.log('ModeSetupModal: Mode saved, calling onComplete');
      alert(`DEBUG: Calling onComplete with: ${selectedMode}`);
      onComplete(selectedMode);
    }
  };

  const handleBack = () => {
    setShowConfirm(false);
    setSelectedMode(null);
  };

  if (showConfirm && selectedMode) {
    return (
      <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
        <div className={`${ASCII_COLORS.modalBg} p-8 rounded-lg shadow-xl w-full max-w-2xl border-2 ${ASCII_COLORS.border} text-center`}>
          <div className="mb-6">
            {selectedMode === 'master' ? (
              <Server size={64} className={`${ASCII_COLORS.accent} mx-auto mb-4`} />
            ) : (
              <Wifi size={64} className={`${ASCII_COLORS.accent} mx-auto mb-4`} />
            )}
            <h2 className={`${ASCII_COLORS.accent} text-2xl font-bold mb-4`}>
              {selectedMode === 'master' ? 'МАСТЕР РЕЖИМ' : 'КЛИЕНТ РЕЖИМ'}
            </h2>
          </div>

          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3">Что произойдет:</h3>
            
            {selectedMode === 'master' ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Database className="w-4 h-4 mr-2 text-green-400" />
                  Создание локальной базы данных на этом устройстве
                </li>
                <li className="flex items-center">
                  <Server className="w-4 h-4 mr-2 text-green-400" />
                  Запуск сервера для подключения других устройств
                </li>
                <li className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-400" />
                  Полные права администратора (создание, удаление, экспорт)
                </li>
                <li className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-400" />
                  Управление пользователями и их правами
                </li>
                <li className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Автоматическая синхронизация с подключенными клиентами
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Wifi className="w-4 h-4 mr-2 text-blue-400" />
                  Подключение к мастер-серверу в локальной сети
                </li>
                <li className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-400" />
                  Работа с правами обычного пользователя
                </li>
                <li className="flex items-center">
                  <Database className="w-4 h-4 mr-2 text-blue-400" />
                  Синхронизация данных с мастер-базой
                </li>
                <li className="flex items-center">
                  <Home className="w-4 h-4 mr-2 text-blue-400" />
                  Возможность работы офлайн с последующей синхронизацией
                </li>
                <li className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Быстрая работа с каталогизацией товаров
                </li>
              </ul>
            )}
          </div>

          <div className="bg-yellow-900 bg-opacity-20 p-4 rounded-lg mb-6">
            <p className="text-yellow-300 text-sm">
              ⚠️ <strong>Важно:</strong> Выбранный режим можно изменить позже в настройках, 
              но это потребует сброса данных {selectedMode === 'master' ? 'и переподключения всех клиентов' : ''}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={handleBack}
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} px-6 py-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
            >
              ← НАЗАД
            </button>
            <button 
              onClick={handleConfirm}
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} px-6 py-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border border-green-500 flex items-center font-semibold`}
            >
              {selectedMode === 'master' ? '🚀 ЗАПУСТИТЬ МАСТЕР' : '📱 ПОДКЛЮЧИТЬСЯ КАК КЛИЕНТ'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-8 rounded-lg shadow-xl w-full max-w-4xl border-2 ${ASCII_COLORS.border}`}>
        <div className="text-center mb-8">
          <h1 className={`${ASCII_COLORS.accent} text-3xl font-bold mb-4`}>
            📦 ДОБРО ПОЖАЛОВАТЬ В INVENTORY OS
          </h1>
          <p className={`${ASCII_COLORS.text} text-lg opacity-80`}>
            Выберите режим работы приложения
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Master Mode */}
          <div 
            onClick={() => handleModeSelect('master')}
            className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-6 cursor-pointer hover:border-green-500 transition-colors relative group`}
          >
            <div className="text-center mb-4">
              <Server size={48} className="mx-auto mb-3 text-green-400" />
              <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>МАСТЕР РЕЖИМ</h2>
              <p className="text-green-400 text-sm font-semibold">Для главного устройства</p>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <Database className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                <div>
                  <strong>Локальная база данных</strong>
                  <br />
                  <span className="opacity-70">Вся информация хранится на этом устройстве</span>
                </div>
              </li>
              <li className="flex items-start">
                <Users className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                <div>
                  <strong>Управление пользователями</strong>
                  <br />
                  <span className="opacity-70">Создание и настройка прав доступа</span>
                </div>
              </li>
              <li className="flex items-start">
                <Shield className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                <div>
                  <strong>Полные права</strong>
                  <br />
                  <span className="opacity-70">Импорт/экспорт, резервное копирование</span>
                </div>
              </li>
              <li className="flex items-start">
                <Server className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                <div>
                  <strong>Сервер синхронизации</strong>
                  <br />
                  <span className="opacity-70">Подключение других устройств через Wi-Fi</span>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-3 bg-green-900 bg-opacity-20 rounded-lg">
              <p className="text-green-300 text-xs">
                ✅ Рекомендуется для стационарного компьютера или планшета администратора
              </p>
            </div>

            <div className="absolute inset-0 bg-green-500 bg-opacity-5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Client Mode */}
          <div 
            onClick={() => handleModeSelect('client')}
            className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors relative group`}
          >
            <div className="text-center mb-4">
              <Wifi size={48} className="mx-auto mb-3 text-blue-400" />
              <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>КЛИЕНТ РЕЖИМ</h2>
              <p className="text-blue-400 text-sm font-semibold">Для рабочих устройств</p>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <Wifi className="w-4 h-4 mr-2 mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <strong>Подключение к серверу</strong>
                  <br />
                  <span className="opacity-70">Синхронизация с мастер-устройством</span>
                </div>
              </li>
              <li className="flex items-start">
                <Home className="w-4 h-4 mr-2 mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <strong>Автономная работа</strong>
                  <br />
                  <span className="opacity-70">Работает даже при потере соединения</span>
                </div>
              </li>
              <li className="flex items-start">
                <Zap className="w-4 h-4 mr-2 mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <strong>Быстрая каталогизация</strong>
                  <br />
                  <span className="opacity-70">Сканирование штрих-кодов, добавление товаров</span>
                </div>
              </li>
              <li className="flex items-start">
                <Users className="w-4 h-4 mr-2 mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <strong>Пользовательские права</strong>
                  <br />
                  <span className="opacity-70">Настраиваются администратором</span>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
              <p className="text-blue-300 text-xs">
                📱 Идеально для смартфонов и планшетов сотрудников склада
              </p>
            </div>

            <div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="bg-yellow-900 bg-opacity-20 p-4 rounded-lg">
            <p className="text-yellow-300 text-sm">
              💡 <strong>Не уверены?</strong> Начните с мастер-режима - его можно использовать как обычное приложение, 
              а клиенты подключать по мере необходимости
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeSetupModal;