
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Send, BrainCircuit, XCircle, Key, CheckCircle, Bot } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
const claudeService = await import('../services/claudeService');
const localLlmService = await import('../services/localLlmService');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatModalProps {
  show: boolean;
  onClose: () => void;
  onDataChange?: () => void; // Callback когда SMARTIE изменяет данные
}

const ChatModal: React.FC<ChatModalProps> = ({ show, onClose, onDataChange }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [provider, setProvider] = useState<'claude' | 'openai' | 'gemini' | 'local'>('claude');
  // Local LLM config
  const [localBaseUrl, setLocalBaseUrl] = useState('http://192.168.222.135:5174');
  const [localModel, setLocalModel] = useState('openai/gpt-oss-20b');
  const [localApiKey, setLocalApiKey] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, show]);

  useEffect(() => {
    if (provider === 'claude') {
      setIsApiKeySet(claudeService.isClaudeInitialized());
      if (show && !claudeService.isClaudeInitialized()) {
        setShowApiKeyInput(true);
      }
    } else if (provider === 'local') {
      setIsApiKeySet(localLlmService.isLocalLLMInitialized());
      if (show && !localLlmService.isLocalLLMInitialized()) {
        setShowApiKeyInput(true);
      }
    } else {
      setIsApiKeySet(false);
      setShowApiKeyInput(true);
    }
  }, [show, provider]);

  useEffect(() => {
    // Приветственное сообщение при первом запуске
    if (show && chatHistory.length === 0 && isApiKeySet) {
      setChatHistory([{
        role: 'assistant',
        content: '🤖 Привет! Я SMARTIE - ваш умный помощник по складу.\n\nЯ могу:\n• Создавать склады, комнаты и контейнеры\n• Добавлять и искать товары\n• Показывать статистику\n• Отвечать на вопросы о складе\n\nПопробуйте: "создай склад Главный" или "покажи сводку"',
        timestamp: new Date()
      }]);
    }
  }, [show, chatHistory.length, isApiKeySet]);

  const handleSetApiKey = () => {
    try {
      if (provider === 'claude') {
        if (!apiKey.trim()) return;
        claudeService.initializeClaudeAPI(apiKey.trim());
        setApiKey('');
      } else if (provider === 'local') {
        // apiKey опционален
        const sanitizedUrl = localBaseUrl.trim().replace(/^@/, '');
        if (!sanitizedUrl) return alert('Укажите Base URL локальной модели');
        localLlmService.initializeLocalLLM({ baseUrl: sanitizedUrl, apiKey: localApiKey.trim() || undefined, model: localModel.trim() || undefined });
        setLocalApiKey('');
      } else {
        return alert('Выбранный провайдер пока не поддерживается.');
      }

      setIsApiKeySet(true);
      setShowApiKeyInput(false);
      
      setChatHistory([{
        role: 'assistant',
        content: '🤖 Привет! Я SMARTIE - ваш умный помощник по складу.\n\nЯ могу:\n• Создавать склады, комнаты и контейнеры\n• Добавлять и искать товары\n• Показывать статистику\n• Отвечать на вопросы о складе\n\nПопробуйте: "создай склад Главный" или "покажи сводку"',
        timestamp: new Date()
      }]);
    } catch (error) {
      alert('Ошибка инициализации API: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isApiKeySet) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const history = chatHistory.map(msg => ({ role: msg.role, content: msg.content }));
      let response = '';
      if (provider === 'claude') {
        response = await claudeService.sendMessageToSMARTIE(userMessage.content, history);
      } else if (provider === 'local') {
        response = await localLlmService.sendMessageToSMARTIE(userMessage.content, history);
      } else {
        response = '❌ Провайдер пока не поддерживается.';
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, assistantMessage]);
      
      // Если сообщение содержит ✅ (успешное выполнение команды), обновляем данные
      if (response.includes('✅') && onDataChange) {
        onDataChange();
      }
      
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Фокус обратно на input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showApiKeyInput) {
        handleSetApiKey();
      } else {
        handleSendMessage();
      }
    }
  };

  const formatMessage = (content: string) => {
    // Базовое форматирование для markdown-подобного текста
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={index} className="font-bold text-yellow-300 mb-2">{line.slice(2, -2)}</div>;
        }
        if (line.startsWith('• ')) {
          return <div key={index} className="ml-4 text-gray-300">• {line.slice(2)}</div>;
        }
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }
        return <div key={index} className="text-gray-200">{line}</div>;
      });
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-4xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center gap-3">
            <BrainCircuit className={`w-6 h-6 ${ASCII_COLORS.accent}`} />
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center gap-2`}>
              SMARTIE
              {isApiKeySet && <span className="text-green-400 text-sm">●</span>}
            </h2>
            <div className="ml-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-300"/>
               <select
                value={provider}
                onChange={(e)=>setProvider(e.target.value as any)}
                className={`text-sm p-1 rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} border ${ASCII_COLORS.border}`}
                title="AI Provider"
              >
                <option value="claude">Claude</option>
                 <option value="local">Local LLM</option>
                <option value="openai" disabled>OpenAI (скоро)</option>
                <option value="gemini" disabled>Gemini (скоро)</option>
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md hover:bg-red-700 border ${ASCII_COLORS.border}`}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Setup */}
        {showApiKeyInput && (
          <div className={`p-4 border-b-2 ${ASCII_COLORS.border} bg-yellow-900 bg-opacity-20`}>
            {provider === 'claude' && (
              <>
                <div className="flex items-center mb-3">
                  <Key className="w-5 h-5 mr-2 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold">Требуется Claude API ключ</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Введите ваш Anthropic API ключ..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`flex-1 p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-sm`}
                  />
                  <button
                    onClick={handleSetApiKey}
                    disabled={!apiKey.trim()}
                    className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Установить
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ключ можно получить на <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">console.anthropic.com</a>
                </p>
              </>
            )}
            {provider === 'local' && (
              <>
                <div className="flex items-center mb-3">
                  <Key className="w-5 h-5 mr-2 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold">Настройка локальной модели (OpenAI API совместимая)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Base URL (e.g. http://192.168.0.2:5174)"
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-sm md:col-span-2`}
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. openai/gpt-oss-20b)"
                    value={localModel}
                    onChange={(e) => setLocalModel(e.target.value)}
                    className={`p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-sm`}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="password"
                    placeholder="API Key (опционально)"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`flex-1 p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-sm`}
                  />
                  <button
                    onClick={handleSetApiKey}
                    className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Установить
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Убедитесь, что сервер LM Studio доступен по указанному адресу и порту.
                </p>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-3 rounded-lg ${
                  message.role === 'user'
                    ? `${ASCII_COLORS.buttonBg} border-r-4 border-blue-500`
                    : `bg-gray-800 border-l-4 border-green-500`
                }`}
              >
                <div className="flex items-start">
                  {message.role === 'assistant' && (
                    <BrainCircuit className="w-5 h-5 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-mono whitespace-pre-wrap">
                      {formatMessage(message.content)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border-l-4 border-green-500 p-3 rounded-lg">
                <div className="flex items-center">
                  <BrainCircuit className="w-5 h-5 mr-2 text-green-400 animate-pulse" />
                  <span className="text-gray-300">SMARTIE печатает...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isApiKeySet && (
          <div className={`p-4 border-t-2 ${ASCII_COLORS.border}`}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Спросите SMARTIE о складе или дайте команду..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className={`flex-1 p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} disabled:opacity-50`}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`${ASCII_COLORS.buttonBg} p-3 px-6 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              💡 Примеры команд: "создай склад Главный", "добавь 10 кг картошки в овощной отдел", "найди яблоки", "покажи сводку"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatModal;