import { useState } from 'react';
import { Key, Crown, Users, BarChart, X, Check, AlertTriangle, Copy } from 'lucide-react';
import licenseService from '../services/licenseService';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseChanged: () => void;
}

export default function LicenseModal({ isOpen, onClose, onLicenseChanged }: LicenseModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'activate' | 'store'>('status');
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);

  const licenseStatus = licenseService.getLicenseStatus();

  const activateLicense = async () => {
    if (!licenseKey.trim()) return;

    setIsActivating(true);
    setActivationResult(null);

    try {
      const result = await licenseService.activateLicense(licenseKey.trim());
      setActivationResult(result);
      
      if (result.success) {
        setLicenseKey('');
        onLicenseChanged();
        setTimeout(() => {
          setActivationResult(null);
        }, 3000);
      }
    } catch (error) {
      setActivationResult({ 
        success: false, 
        message: 'Ошибка активации лицензии' 
      });
    } finally {
      setIsActivating(false);
    }
  };

  const generateDemoKey = (type: 'HOME_PRO' | 'MULTI_LOCATION' | 'ANALYTICS_PRO') => {
    const demoKey = licenseService.generateLicenseKey(type, 30); // 30 days
    navigator.clipboard.writeText(demoKey);
    setLicenseKey(demoKey);
  };

  const products = [
    {
      id: 'HOME_PRO',
      name: 'Home Pro',
      price: '$9.99',
      icon: <Crown className="w-6 h-6" />,
      color: 'text-yellow-600 bg-yellow-50',
      features: [
        'Безлимит складов и комнат',
        'Экспорт в Excel/PDF', 
        'Кастомные метки',
        'Приоритетная поддержка'
      ]
    },
    {
      id: 'MULTI_LOCATION',
      name: 'Multi-Location',
      price: '$19.99',
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600 bg-blue-50',
      features: [
        'До 20 устройств',
        'Синхронизация в реальном времени',
        'Множественные локации',
        'Командная работа'
      ]
    },
    {
      id: 'ANALYTICS_PRO',
      name: 'Analytics Pro',
      price: '$14.99',
      icon: <BarChart className="w-6 h-6" />,
      color: 'text-green-600 bg-green-50',
      features: [
        'Расширенная аналитика',
        'Автоматические отчеты',
        'Прогнозирование',
        'API доступ'
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Лицензии</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'status', label: 'Статус' },
              { key: 'activate', label: 'Активация' },
              { key: 'store', label: 'Магазин' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div>
              {/* Current Status */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Текущий статус</h3>
                <div className={`p-4 rounded-lg border-2 ${
                  licenseStatus.isPro ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {licenseStatus.isPro ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    )}
                    <span className="font-medium">
                      {licenseStatus.isPro ? 'Pro аккаунт' : 'Бесплатная версия'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Licenses */}
              {licenseStatus.activeLicenses.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Активные лицензии</h3>
                  <div className="space-y-2">
                    {licenseStatus.activeLicenses.map((license, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-green-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{license.name}</span>
                          {license.expiresAt && (
                            <span className="text-sm text-gray-600">
                              до {license.expiresAt.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Limits */}
              <div>
                <h3 className="font-medium mb-3">Текущие ограничения</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {licenseStatus.limits.maxWarehouses === Infinity ? '∞' : licenseStatus.limits.maxWarehouses}
                    </div>
                    <div className="text-sm text-gray-600">Складов</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {licenseStatus.limits.maxRooms === Infinity ? '∞' : licenseStatus.limits.maxRooms}
                    </div>
                    <div className="text-sm text-gray-600">Комнат</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {licenseStatus.limits.maxDevices}
                    </div>
                    <div className="text-sm text-gray-600">Устройств</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className={`text-sm font-medium ${
                      licenseStatus.limits.hasAnalytics ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {licenseStatus.limits.hasAnalytics ? '✓' : '✗'} Аналитика
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activate Tab */}
          {activeTab === 'activate' && (
            <div>
              <h3 className="font-medium mb-3">Активация лицензии</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ключ лицензии
                  </label>
                  <input
                    type="text"
                    placeholder="Введите ключ лицензии..."
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isActivating}
                  />
                </div>

                <button
                  onClick={activateLicense}
                  disabled={isActivating || !licenseKey.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isActivating ? 'Активация...' : 'Активировать'}
                </button>

                {activationResult && (
                  <div className={`p-3 rounded-lg ${
                    activationResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {activationResult.message}
                  </div>
                )}

                {/* Demo Keys */}
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">🧪 Demo версии (30 дней)</h4>
                  <div className="space-y-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => generateDemoKey(product.id as any)}
                        className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{product.name}</span>
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">
                    * Клик копирует demo ключ в буфер и поле ввода
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <div>
              <h3 className="font-medium mb-3">Магазин расширений</h3>
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="p-4 border rounded-lg hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${product.color}`}>
                        {product.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{product.name}</h4>
                          <span className="font-bold text-blue-600">{product.price}</span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {product.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                          Купить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}