interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'EUR' | 'RUB' | 'UAH' | 'PLN';
  features: string[];
  licenseType: string;
  durationDays?: number;
}

interface PaymentSession {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  createdAt: Date;
  completedAt?: Date;
  licenseKey?: string;
}

import localizationService from './localizationService';

class PaymentService {
  private sessions = new Map<string, PaymentSession>();
  private readonly STORAGE_KEY = 'payment-sessions';

  private products: PaymentProduct[] = [
    {
      id: 'home_pro',
      name: 'Home Pro',
      description: 'Снятие ограничений на количество складов и комнат',
      price: 9.99,
      currency: 'USD',
      features: [
        'Безлимит складов',
        'Безлимит комнат', 
        'Экспорт данных',
        'Кастомные метки',
        'Приоритетная поддержка'
      ],
      licenseType: 'HOME_PRO'
    },
    {
      id: 'multi_location',
      name: 'Multi-Location',
      description: 'Расширение до 20 устройств в локальной сети',
      price: 19.99,
      currency: 'USD',
      features: [
        'До 20 устройств',
        'Синхронизация в реальном времени',
        'Множественные локации',
        'Командная работа'
      ],
      licenseType: 'MULTI_LOCATION'
    },
    {
      id: 'analytics_pro',
      name: 'Analytics Pro',
      description: 'Расширенная аналитика и отчеты',
      price: 14.99,
      currency: 'USD',
      features: [
        'Расширенная аналитика',
        'Автоматические отчеты',
        'Прогнозирование запасов',
        'API доступ'
      ],
      licenseType: 'ANALYTICS_PRO'
    }
  ];

  constructor() {
    this.loadSessions();
  }

  private loadSessions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = new Map(
          data.map((session: any) => [
            session.id,
            {
              ...session,
              createdAt: new Date(session.createdAt),
              completedAt: session.completedAt ? new Date(session.completedAt) : undefined
            }
          ])
        );
      }
    } catch (error) {
      console.error('Error loading payment sessions:', error);
    }
  }

  private saveSessions(): void {
    try {
      const data = Array.from(this.sessions.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving payment sessions:', error);
    }
  }

  private generateSessionId(): string {
    return 'pay_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private convertPrice(price: number, fromCurrency: string, toCurrency: string): number {
    // Простые курсы для демо (в продакшн нужно использовать реальные курсы)
    const exchangeRates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'UAH': 41, 'RUB': 90, 'PLN': 4.1 },
      'EUR': { 'USD': 1.18, 'UAH': 48, 'RUB': 106, 'PLN': 4.8 },
      'UAH': { 'USD': 0.024, 'EUR': 0.021, 'PLN': 0.10 },
      'RUB': { 'USD': 0.011, 'EUR': 0.0094, 'PLN': 0.045 },
      'PLN': { 'USD': 0.24, 'EUR': 0.21, 'UAH': 10 }
    };

    if (fromCurrency === toCurrency) return price;
    
    const rate = exchangeRates[fromCurrency]?.[toCurrency];
    if (rate) {
      return Math.round(price * rate * 100) / 100; // Округляем до 2 знаков
    }
    
    return price; // Если курса нет, возвращаем исходную цену
  }

  // Get available products with localized currencies
  getProducts(): PaymentProduct[] {
    const availableCurrencies = localizationService.getAvailableCurrencies();
    
    return this.products.map(product => {
      // Адаптируем цену и валюту под локаль
      let price = product.price;
      let currency = product.currency;
      
      // Конвертируем валюту если нужно
      if (!availableCurrencies.includes(currency)) {
        const preferredCurrency = availableCurrencies[0];
        price = this.convertPrice(price, currency, preferredCurrency);
        currency = preferredCurrency as any;
      }
      
      return {
        ...product,
        price,
        currency
      };
    }).filter(product => {
      // Исключаем продукты с заблокированными валютами
      return availableCurrencies.includes(product.currency);
    });
  }

  getProduct(productId: string): PaymentProduct | null {
    return this.products.find(p => p.id === productId) || null;
  }

  // Create payment session
  async createPaymentSession(productId: string): Promise<PaymentSession> {
    const product = this.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const session: PaymentSession = {
      id: this.generateSessionId(),
      productId,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);
    this.saveSessions();

    return session;
  }

  // Get payment session
  getPaymentSession(sessionId: string): PaymentSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Process payment (Demo implementation)
  async processPayment(
    sessionId: string, 
    paymentData: { 
      method: string; 
      cardNumber?: string; 
      email?: string;
      cryptoWallet?: string;
    }
  ): Promise<{ success: boolean; message: string; licenseKey?: string }> {
    
    const session = this.getPaymentSession(sessionId);
    if (!session) {
      return { success: false, message: 'Payment session not found' };
    }

    if (session.status !== 'pending') {
      return { success: false, message: 'Payment session is not pending' };
    }

    try {
      // Simulate different payment methods
      const success = await this.simulatePayment(paymentData.method, session.amount);
      
      if (success) {
        // Generate license key
        const product = this.getProduct(session.productId);
        if (!product) {
          return { success: false, message: 'Product not found' };
        }

        // Import license service to generate key
        const licenseKey = this.generateLicenseKey(product.licenseType, product.durationDays);
        
        // Update session
        session.status = 'completed';
        session.completedAt = new Date();
        session.paymentMethod = paymentData.method;
        session.licenseKey = licenseKey;
        
        this.sessions.set(sessionId, session);
        this.saveSessions();

        return {
          success: true,
          message: 'Payment completed successfully!',
          licenseKey
        };
        
      } else {
        session.status = 'failed';
        this.sessions.set(sessionId, session);
        this.saveSessions();
        
        return { success: false, message: 'Payment failed. Please try again.' };
      }
      
    } catch (error) {
      console.error('Payment processing error:', error);
      
      session.status = 'failed';
      this.sessions.set(sessionId, session);
      this.saveSessions();
      
      return { success: false, message: 'Payment processing error' };
    }
  }

  // Simulate payment processing
  private async simulatePayment(method: string, amount: number): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate different success rates for different payment methods
    switch (method) {
      case 'card':
        return Math.random() > 0.1; // 90% success rate
      case 'paypal':
        return Math.random() > 0.05; // 95% success rate
      case 'crypto':
        return Math.random() > 0.15; // 85% success rate
      case 'bank':
        return Math.random() > 0.2; // 80% success rate
      default:
        return false;
    }
  }

  // Generate license key (simplified version)
  private generateLicenseKey(licenseType: string, durationDays?: number): string {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : undefined;
    
    const licenseData = {
      id,
      type: licenseType,
      expiresAt: expiresAt?.getTime()
    };

    // Simple encoding (in production, use proper encryption)
    return btoa(JSON.stringify(licenseData)).replace(/=/g, '');
  }

  // Cancel payment session
  async cancelPaymentSession(sessionId: string): Promise<boolean> {
    const session = this.getPaymentSession(sessionId);
    if (!session) {
      return false;
    }

    if (session.status === 'pending') {
      session.status = 'cancelled';
      this.sessions.set(sessionId, session);
      this.saveSessions();
      return true;
    }

    return false;
  }

  // Get payment history
  getPaymentHistory(): PaymentSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Check if currency is blocked for current locale
  isCurrencyBlocked(): boolean {
    return localizationService.isRussianCurrencyBlocked();
  }

  // Get blocked currency message
  getBlockedCurrencyMessage(): string {
    return localizationService.getBlockedCurrencyMessage();
  }

  // Get completed payments
  getCompletedPayments(): PaymentSession[] {
    return this.getPaymentHistory().filter(session => session.status === 'completed');
  }

  // Check if product is already purchased
  isProductPurchased(productId: string): boolean {
    return Array.from(this.sessions.values()).some(
      session => session.productId === productId && session.status === 'completed'
    );
  }

  // Get total spent
  getTotalSpent(): number {
    return Array.from(this.sessions.values())
      .filter(session => session.status === 'completed')
      .reduce((total, session) => total + session.amount, 0);
  }

  // Real payment integration helpers (for production)
  
  // Stripe integration
  async createStripePayment(sessionId: string, stripePublicKey: string): Promise<any> {
    // This would integrate with Stripe API
    throw new Error('Stripe integration not implemented in demo');
  }

  // PayPal integration
  async createPayPalPayment(sessionId: string): Promise<any> {
    // This would integrate with PayPal API
    throw new Error('PayPal integration not implemented in demo');
  }

  // Cryptocurrency payment
  async createCryptoPayment(sessionId: string, currency: 'BTC' | 'ETH' | 'USDT'): Promise<any> {
    // This would integrate with crypto payment processor
    throw new Error('Crypto payment integration not implemented in demo');
  }

  // Get payment methods
  getAvailablePaymentMethods(): Array<{
    id: string;
    name: string;
    description: string;
    fees: string;
    processingTime: string;
    icon: string;
  }> {
    return [
      {
        id: 'card',
        name: 'Банковская карта',
        description: 'Visa, MasterCard, МИР',
        fees: '2.9%',
        processingTime: 'Мгновенно',
        icon: '💳'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'Безопасные платежи через PayPal',
        fees: '3.4%',
        processingTime: 'Мгновенно',
        icon: '🅿️'
      },
      {
        id: 'crypto',
        name: 'Криптовалюта',
        description: 'BTC, ETH, USDT',
        fees: '1%',
        processingTime: '10-30 минут',
        icon: '₿'
      },
      {
        id: 'bank',
        name: 'Банковский перевод',
        description: 'Перевод на банковский счет',
        fees: '0%',
        processingTime: '1-3 дня',
        icon: '🏦'
      }
    ];
  }
}

// Singleton instance
export const paymentService = new PaymentService();
export default paymentService;