import { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, X, Check, Crown, Users, BarChart, Loader, AlertCircle, Copy } from 'lucide-react';
import paymentService from '../services/paymentService';
import licenseService from '../services/licenseService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  onPurchaseComplete: (licenseKey: string) => void;
}

interface PaymentSession {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export default function PaymentModal({ isOpen, onClose, productId, onPurchaseComplete }: PaymentModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(productId || null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [currentSession, setCurrentSession] = useState<PaymentSession | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'payment' | 'processing' | 'success' | 'error'>('select');
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string; licenseKey?: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cryptoWallet: ''
  });

  const products = paymentService.getProducts();
  const paymentMethods = paymentService.getAvailablePaymentMethods();

  useEffect(() => {
    if (productId) {
      setSelectedProduct(productId);
    }
  }, [productId]);

  const getProductIcon = (productId: string) => {
    switch (productId) {
      case 'home_pro': return <Crown className="w-6 h-6" />;
      case 'multi_location': return <Users className="w-6 h-6" />;
      case 'analytics_pro': return <BarChart className="w-6 h-6" />;
      default: return <ShoppingCart className="w-6 h-6" />;
    }
  };

  const getProductColor = (productId: string) => {
    switch (productId) {
      case 'home_pro': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'multi_location': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'analytics_pro': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
  };

  const handleContinueToPayment = async () => {
    if (!selectedProduct) return;

    try {
      const session = await paymentService.createPaymentSession(selectedProduct);
      setCurrentSession(session);
      setPaymentStep('payment');
    } catch (error) {
      console.error('Error creating payment session:', error);
      setPaymentResult({ success: false, message: 'Не удалось создать сессию платежа' });
      setPaymentStep('error');
    }
  };

  const handleProcessPayment = async () => {
    if (!currentSession) return;

    setPaymentStep('processing');

    try {
      const result = await paymentService.processPayment(currentSession.id, {
        method: selectedPaymentMethod,
        cardNumber: formData.cardNumber,
        email: formData.email,
        cryptoWallet: formData.cryptoWallet
      });

      setPaymentResult(result);

      if (result.success && result.licenseKey) {
        // Auto-activate license
        const activationResult = await licenseService.activateLicense(result.licenseKey);
        if (activationResult.success) {
          setPaymentStep('success');
          onPurchaseComplete(result.licenseKey);
        } else {
          setPaymentStep('error');
          setPaymentResult({ success: false, message: 'Ошибка активации лицензии: ' + activationResult.message });
        }
      } else {
        setPaymentStep('error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentResult({ success: false, message: 'Ошибка обработки платежа' });
      setPaymentStep('error');
    }
  };

  const handleRetry = () => {
    setPaymentStep('payment');
    setPaymentResult(null);
  };

  const handleClose = () => {
    setPaymentStep('select');
    setSelectedProduct(productId || null);
    setCurrentSession(null);
    setPaymentResult(null);
    setFormData({
      email: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cryptoWallet: ''
    });
    onClose();
  };

  const copyLicenseKey = () => {
    if (paymentResult?.licenseKey) {
      navigator.clipboard.writeText(paymentResult.licenseKey);
    }
  };

  if (!isOpen) return null;

  const selectedProductData = selectedProduct ? paymentService.getProduct(selectedProduct) : null;
  const selectedPaymentMethodData = paymentMethods.find(m => m.id === selectedPaymentMethod);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">
                {paymentStep === 'select' && 'Выберите продукт'}
                {paymentStep === 'payment' && 'Оплата'}
                {paymentStep === 'processing' && 'Обработка платежа'}
                {paymentStep === 'success' && 'Успешно!'}
                {paymentStep === 'error' && 'Ошибка'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Product Selection */}
          {paymentStep === 'select' && (
            <div className="space-y-4">
              {products.map((product) => {
                const isOwned = paymentService.isProductPurchased(product.id);
                return (
                  <div
                    key={product.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedProduct === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : isOwned
                        ? 'border-green-200 bg-green-50 opacity-60'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => !isOwned && handleProductSelect(product.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${getProductColor(product.id)}`}>
                        {getProductIcon(product.id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <div className="text-right">
                            <div className="font-bold text-xl text-blue-600">
                              ${product.price}
                            </div>
                            {isOwned && (
                              <div className="text-sm text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Куплено
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 mb-3">{product.description}</p>
                        <div className="space-y-2">
                          {product.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Check className="w-4 h-4 text-green-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment Form */}
          {paymentStep === 'payment' && selectedProductData && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Сводка заказа</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${getProductColor(selectedProductData.id)}`}>
                      {getProductIcon(selectedProductData.id)}
                    </div>
                    <div>
                      <div className="font-medium">{selectedProductData.name}</div>
                      <div className="text-sm text-gray-600">{selectedProductData.description}</div>
                    </div>
                  </div>
                  <div className="font-bold text-xl">${selectedProductData.price}</div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="font-medium mb-3">Способ оплаты</h3>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePaymentMethodSelect(method.id)}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{method.icon}</div>
                        <div className="font-medium text-sm">{method.name}</div>
                        <div className="text-xs text-gray-500">{method.fees}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email для чека
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                {selectedPaymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Номер карты
                      </label>
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Срок действия
                        </label>
                        <input
                          type="text"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={formData.cvv}
                          onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedPaymentMethod === 'crypto' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Кошелек для возврата (опционально)
                    </label>
                    <input
                      type="text"
                      value={formData.cryptoWallet}
                      onChange={(e) => setFormData(prev => ({ ...prev, cryptoWallet: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0x... или bc1..."
                    />
                  </div>
                )}
              </div>

              {/* Payment Info */}
              {selectedPaymentMethodData && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700">
                    <strong>{selectedPaymentMethodData.name}</strong>
                    <br />
                    Комиссия: {selectedPaymentMethodData.fees}
                    <br />
                    Время обработки: {selectedPaymentMethodData.processingTime}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing */}
          {paymentStep === 'processing' && (
            <div className="text-center py-8">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <h3 className="font-medium text-lg mb-2">Обработка платежа...</h3>
              <p className="text-gray-600">Пожалуйста, не закрывайте окно</p>
            </div>
          )}

          {/* Success */}
          {paymentStep === 'success' && paymentResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-medium text-lg mb-2">Оплата успешна!</h3>
              <p className="text-gray-600 mb-4">{paymentResult.message}</p>
              
              {paymentResult.licenseKey && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 mb-2">Лицензия автоматически активирована!</p>
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    <code className="flex-1 text-sm font-mono text-left">
                      {paymentResult.licenseKey}
                    </code>
                    <button
                      onClick={copyLicenseKey}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Копировать ключ"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {paymentStep === 'error' && paymentResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-medium text-lg mb-2">Ошибка оплаты</h3>
              <p className="text-red-600 mb-4">{paymentResult.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between">
          {paymentStep === 'select' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleContinueToPayment}
                disabled={!selectedProduct || paymentService.isProductPurchased(selectedProduct)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Продолжить
              </button>
            </>
          )}

          {paymentStep === 'payment' && (
            <>
              <button
                onClick={() => setPaymentStep('select')}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Назад
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={!formData.email.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Оплатить ${selectedProductData?.price}
              </button>
            </>
          )}

          {paymentStep === 'error' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Закрыть
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Повторить
              </button>
            </>
          )}

          {(paymentStep === 'success' || paymentStep === 'processing') && (
            <button
              onClick={handleClose}
              disabled={paymentStep === 'processing'}
              className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Готово
            </button>
          )}
        </div>
      </div>
    </div>
  );
}