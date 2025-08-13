import { useState, useEffect } from 'react';
import { 
  initializeClaudeAPI, 
  initializeOpenAI, 
  initializeGemini, 
  initializeLocalLLM,
  getCurrentProvider,
  setProvider,
  isAnyProviderInitialized,
  getAvailableProviders,
  type AIProvider
} from '../services/smartieService';

interface AIProviderModalProps {
  show: boolean;
  onClose: () => void;
  onProviderReady: () => void;
}

const AIProviderModal = ({ show, onClose, onProviderReady }: AIProviderModalProps) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [localUrl, setLocalUrl] = useState('http://192.168.222.135:5174');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);

  useEffect(() => {
    if (show) {
      setSelectedProvider(getCurrentProvider());
      setAvailableProviders(getAvailableProviders());
      // Загружаем сохраненные данные
      const savedKeys = JSON.parse(localStorage.getItem('smartie-api-keys') || '{}');
      if (savedKeys[selectedProvider]) {
        setApiKey(savedKeys[selectedProvider]);
      }
      const savedUrl = localStorage.getItem('smartie-local-url');
      if (savedUrl) {
        setLocalUrl(savedUrl);
      }
    }
  }, [show, selectedProvider]);

  const handleInitialize = async () => {
    if (!apiKey && selectedProvider !== 'local') {
      setError('Введите API ключ');
      return;
    }

    if (!localUrl && selectedProvider === 'local') {
      setError('Введите URL локального сервера');
      return;
    }

    setIsInitializing(true);
    setError('');

    try {
      let success = false;
      
      switch (selectedProvider) {
        case 'claude':
          success = await initializeClaudeAPI(apiKey);
          break;
        case 'openai':
          success = await initializeOpenAI(apiKey);
          break;
        case 'gemini':
          success = await initializeGemini(apiKey);
          break;
        case 'local':
          success = initializeLocalLLM(localUrl);
          break;
      }

      if (success) {
        // Сохраняем данные
        if (selectedProvider !== 'local') {
          const savedKeys = JSON.parse(localStorage.getItem('smartie-api-keys') || '{}');
          savedKeys[selectedProvider] = apiKey;
          localStorage.setItem('smartie-api-keys', JSON.stringify(savedKeys));
        } else {
          localStorage.setItem('smartie-local-url', localUrl);
        }

        setProvider(selectedProvider);
        onProviderReady();
        onClose();
      } else {
        setError(`Не удалось инициализировать ${selectedProvider.toUpperCase()} API`);
      }
    } catch (error) {
      setError(`Ошибка инициализации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setError('');
    
    // Загружаем сохраненный API ключ для выбранного провайдера
    const savedKeys = JSON.parse(localStorage.getItem('smartie-api-keys') || '{}');
    setApiKey(savedKeys[provider] || '');
  };

  const getProviderInfo = (provider: AIProvider) => {
    switch (provider) {
      case 'claude':
        return {
          name: 'Claude (Anthropic)',
          description: 'Самый умный ассистент для сложных задач',
          icon: '🧠',
          keyPlaceholder: 'sk-ant-api03-...',
          keyLink: 'https://console.anthropic.com/'
        };
      case 'openai':
        return {
          name: 'ChatGPT (OpenAI)',
          description: 'Популярный и быстрый ассистент',
          icon: '🤖',
          keyPlaceholder: 'sk-proj-...',
          keyLink: 'https://platform.openai.com/api-keys'
        };
      case 'gemini':
        return {
          name: 'Gemini (Google)',
          description: 'Быстрый и бесплатный ассистент',
          icon: '💎',
          keyPlaceholder: 'AIza...',
          keyLink: 'https://makersuite.google.com/app/apikey'
        };
      case 'local':
        return {
          name: 'Local LLM',
          description: 'Ваш локальный сервер',
          icon: '🏠',
          keyPlaceholder: 'http://localhost:5174',
          keyLink: ''
        };
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            🤖 Настройка SMARTIE AI
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Выберите AI провайдера:
          </h3>
          
          <div className="space-y-2">
            {(['claude', 'openai', 'gemini', 'local'] as AIProvider[]).map((provider) => {
              const info = getProviderInfo(provider);
              const isAvailable = availableProviders.includes(provider);
              
              return (
                <div
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProvider === provider
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {info.name}
                          {isAvailable && <span className="ml-2 text-green-500">✓</span>}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {info.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          {selectedProvider === 'local' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL локального сервера:
              </label>
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder={getProviderInfo(selectedProvider).keyPlaceholder}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  API ключ:
                </label>
                {getProviderInfo(selectedProvider).keyLink && (
                  <a
                    href={getProviderInfo(selectedProvider).keyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Получить ключ
                  </a>
                )}
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getProviderInfo(selectedProvider).keyPlaceholder}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleInitialize}
            disabled={isInitializing || (!apiKey && selectedProvider !== 'local') || (!localUrl && selectedProvider === 'local')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isInitializing ? '🔄 Подключение...' : '🚀 Подключить'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Отмена
          </button>
        </div>

        {availableProviders.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm text-green-700 dark:text-green-300">
              ✅ Подключенные провайдеры: {availableProviders.join(', ')}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          💡 Ключи сохраняются локально в браузере и не передаются третьим лицам
        </div>
      </div>
    </div>
  );
};

export default AIProviderModal;