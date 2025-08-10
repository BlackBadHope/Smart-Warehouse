import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Check, AlertCircle, Settings } from 'lucide-react';
import updateService from '../services/updateService';

interface UpdateInfo {
  version: string;
  changelog: string[];
  downloadUrl: string;
  isRequired: boolean;
  releaseDate: string;
}

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<'available' | 'downloading' | 'downloaded' | 'installing' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState(updateService.getConfig());

  useEffect(() => {
    const handleUpdate = (type: string, data: any) => {
      switch (type) {
        case 'update_available':
          setUpdateInfo(data);
          setStatus('available');
          break;
        case 'update_downloaded':
          setStatus('downloaded');
          break;
        case 'update_installed':
          setStatus(null);
          setUpdateInfo(null);
          break;
        case 'no_updates':
          // Show temporary success message
          setStatus(null);
          break;
        case 'update_error':
          setStatus('error');
          setErrorMessage(data.message);
          break;
      }
    };

    updateService.onUpdate(handleUpdate);

    return () => {
      updateService.offUpdate(handleUpdate);
    };
  }, []);

  const handleDownload = () => {
    if (updateInfo) {
      setStatus('downloading');
      // Download is handled automatically by updateService
    }
  };

  const handleInstall = () => {
    if (updateInfo) {
      setStatus('installing');
      updateService.installUpdate(updateInfo);
    }
  };

  const handleDismiss = () => {
    setStatus(null);
    setUpdateInfo(null);
    setErrorMessage('');
  };

  const handleCheckManually = async () => {
    setStatus('downloading'); // Reuse downloading status for checking
    await updateService.manualCheckForUpdates();
    setTimeout(() => {
      if (status === 'downloading') {
        setStatus(null); // Clear if no updates found
      }
    }, 2000);
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updateService.updateConfig(newConfig);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Settings Modal
  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Настройки обновлений</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Проверять каждые (минут)
            </label>
            <select
              value={config.checkInterval}
              onChange={(e) => handleConfigChange('checkInterval', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 минут</option>
              <option value={60}>1 час</option>
              <option value={180}>3 часа</option>
              <option value={360}>6 часов</option>
              <option value={720}>12 часов</option>
              <option value={1440}>24 часа</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Автоматическая загрузка
            </label>
            <input
              type="checkbox"
              checked={config.autoDownload}
              onChange={(e) => handleConfigChange('autoDownload', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Автоматическая установка
            </label>
            <input
              type="checkbox"
              checked={config.autoInstall}
              onChange={(e) => handleConfigChange('autoInstall', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Канал обновлений
            </label>
            <select
              value={config.channel}
              onChange={(e) => handleConfigChange('channel', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="stable">Стабильный</option>
              <option value="beta">Бета</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Don't render if no update status
  if (!status && !showSettings) return null;

  return (
    <>
      {/* Update notification */}
      {status && (
        <div className={`fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm z-40 ${
          updateInfo?.isRequired ? 'border-red-200' : 'border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2 rounded-lg ${
              status === 'error' ? 'bg-red-50 text-red-600' :
              status === 'downloaded' ? 'bg-green-50 text-green-600' :
              status === 'installing' || status === 'downloading' ? 'bg-blue-50 text-blue-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              {status === 'error' && <AlertCircle className="w-5 h-5" />}
              {status === 'downloaded' && <Check className="w-5 h-5" />}
              {(status === 'installing' || status === 'downloading') && <RefreshCw className="w-5 h-5 animate-spin" />}
              {status === 'available' && <Download className="w-5 h-5" />}
            </div>

            {/* Content */}
            <div className="flex-1">
              {status === 'available' && (
                <>
                  <h4 className="font-medium text-gray-900">
                    {updateInfo?.isRequired ? 'Критическое обновление' : 'Обновление доступно'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Версия {updateInfo?.version}
                  </p>
                  {updateInfo?.releaseDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(updateInfo.releaseDate)}
                    </p>
                  )}
                  {updateInfo?.changelog && updateInfo.changelog.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Что нового:</p>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        {updateInfo.changelog.slice(0, 2).map((change, index) => (
                          <li key={index}>• {change}</li>
                        ))}
                        {updateInfo.changelog.length > 2 && (
                          <li className="text-gray-500">и ещё {updateInfo.changelog.length - 2} изменений...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {status === 'downloading' && (
                <>
                  <h4 className="font-medium text-gray-900">Загрузка обновления</h4>
                  <p className="text-sm text-gray-600">Подготовка к установке...</p>
                </>
              )}

              {status === 'downloaded' && (
                <>
                  <h4 className="font-medium text-gray-900">Готово к установке</h4>
                  <p className="text-sm text-gray-600">Обновление загружено и готово</p>
                </>
              )}

              {status === 'installing' && (
                <>
                  <h4 className="font-medium text-gray-900">Установка обновления</h4>
                  <p className="text-sm text-gray-600">Пожалуйста, подождите...</p>
                </>
              )}

              {status === 'error' && (
                <>
                  <h4 className="font-medium text-red-900">Ошибка обновления</h4>
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </>
              )}
            </div>

            {/* Close button */}
            {!updateInfo?.isRequired && status !== 'installing' && (
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {status === 'available' && (
              <>
                <button
                  onClick={handleDownload}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg ${
                    updateInfo?.isRequired
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Загрузить
                </button>
                {!updateInfo?.isRequired && (
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
                  >
                    Позже
                  </button>
                )}
              </>
            )}

            {status === 'downloaded' && (
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Установить
              </button>
            )}

            {status === 'error' && (
              <button
                onClick={handleCheckManually}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Повторить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating update button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 left-4 p-3 bg-gray-100 text-gray-600 rounded-full shadow-lg hover:bg-gray-200 z-40"
        title="Настройки обновлений"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Manual check button */}
      <button
        onClick={handleCheckManually}
        className="fixed bottom-4 left-16 p-3 bg-blue-100 text-blue-600 rounded-full shadow-lg hover:bg-blue-200 z-40"
        title="Проверить обновления"
      >
        <RefreshCw className="w-5 h-5" />
      </button>

      {/* Settings Modal */}
      {showSettings && <SettingsModal />}
    </>
  );
}