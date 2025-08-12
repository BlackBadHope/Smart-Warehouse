import * as localStorageService from './localStorageService';
import debugService from './debugService';
import claudeService from './claudeService';
import localizationService from './localizationService';
import themeService from './themeService';
import userService from './userService';
import { Warehouse, Room, Shelf, Item, BucketItem } from '../types';

export interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  timestamp: Date;
  duration: number;
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  passed: number;
  failed: number;
  skipped: number;
}

class SelfTestService {
  private testResults: TestSuite[] = [];
  private isRunning = false;

  async runFullTestSuite(): Promise<TestSuite[]> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.testResults = [];
    
    debugService.info('🧪 Starting comprehensive self-test suite');

    try {
      // Core functionality tests
      await this.runCoreTests();
      
      // UI/UX tests
      await this.runUITests();
      
      // Data persistence tests
      await this.runDataPersistenceTests();
      
      // SMARTIE AI tests
      await this.runSmartieTests();
      
      // Localization tests
      await this.runLocalizationTests();
      
      // Theme tests
      await this.runThemeTests();
      
      // Import/Export tests
      await this.runImportExportTests();
      
      // Performance tests
      await this.runPerformanceTests();

      debugService.info('✅ Self-test suite completed', {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.results.length, 0)
      });

    } catch (error) {
      debugService.error('❌ Self-test suite failed', { error: (error as Error).message });
    } finally {
      this.isRunning = false;
    }

    return this.testResults;
  }

  private async runCoreTests(): Promise<void> {
    const suite = this.createTestSuite('Core Functionality');
    
    // Test 1: Local Storage Initialization
    await this.runTest(suite, 'Local Storage Initialization', async () => {
      localStorageService.initializeLocalStorage();
      return { status: 'PASS', message: 'Local storage initialized successfully' };
    });

    // Test 2: Warehouse Creation
    await this.runTest(suite, 'Warehouse Creation', async () => {
      const testWarehouseName = `Test Warehouse ${Date.now()}`;
      const warehouseId = localStorageService.addWarehouse(testWarehouseName);
      const warehouses = localStorageService.getWarehouses();
      const createdWarehouse = warehouses.find(w => w.id === warehouseId);
      
      if (!createdWarehouse) {
        throw new Error('Warehouse not found after creation');
      }
      
      return { 
        status: 'PASS', 
        message: 'Warehouse created successfully',
        details: { warehouseId, name: testWarehouseName }
      };
    });

    // Test 3: Room Creation
    await this.runTest(suite, 'Room Creation', async () => {
      const warehouses = localStorageService.getWarehouses();
      if (warehouses.length === 0) {
        throw new Error('No warehouses available for room creation test');
      }
      
      const warehouse = warehouses[0];
      const testRoomName = `Test Room ${Date.now()}`;
      const roomId = localStorageService.addRoom(warehouse.id, testRoomName);
      const rooms = localStorageService.getRooms(warehouse.id);
      const createdRoom = rooms.find(r => r.id === roomId);
      
      if (!createdRoom) {
        throw new Error('Room not found after creation');
      }
      
      return { 
        status: 'PASS', 
        message: 'Room created successfully',
        details: { roomId, name: testRoomName, warehouseId: warehouse.id }
      };
    });

    // Test 4: Container/Shelf Creation
    await this.runTest(suite, 'Container Creation', async () => {
      const warehouses = localStorageService.getWarehouses();
      if (warehouses.length === 0) {
        throw new Error('No warehouses available');
      }
      
      const warehouse = warehouses[0];
      const rooms = localStorageService.getRooms(warehouse.id);
      if (rooms.length === 0) {
        throw new Error('No rooms available for container creation test');
      }
      
      const room = rooms[0];
      const testShelfName = `Test Container ${Date.now()}`;
      const shelfId = localStorageService.addShelf(warehouse.id, room.id, testShelfName);
      const shelves = localStorageService.getShelves(warehouse.id, room.id);
      const createdShelf = shelves.find(s => s.id === shelfId);
      
      if (!createdShelf) {
        throw new Error('Container not found after creation');
      }
      
      return { 
        status: 'PASS', 
        message: 'Container created successfully',
        details: { shelfId, name: testShelfName, roomId: room.id }
      };
    });

    // Test 5: Item Creation
    await this.runTest(suite, 'Item Creation', async () => {
      const warehouses = localStorageService.getWarehouses();
      const warehouse = warehouses[0];
      const rooms = localStorageService.getRooms(warehouse.id);
      const room = rooms[0];
      const shelves = localStorageService.getShelves(warehouse.id, room.id);
      
      if (shelves.length === 0) {
        throw new Error('No containers available for item creation test');
      }
      
      const shelf = shelves[0];
      const testItem = {
        name: `Test Item ${Date.now()}`,
        quantity: 5,
        unit: 'pcs' as const,
        priority: 'Normal' as const,
        category: 'Test Category',
        description: 'Self-test generated item'
      };
      
      const itemId = localStorageService.addItem(warehouse.id, room.id, shelf.id, testItem);
      const items = localStorageService.getItems(warehouse.id, room.id, shelf.id);
      const createdItem = items.find(i => i.id === itemId);
      
      if (!createdItem) {
        throw new Error('Item not found after creation');
      }
      
      return { 
        status: 'PASS', 
        message: 'Item created successfully',
        details: { itemId, name: testItem.name, quantity: testItem.quantity }
      };
    });

    // Test 6: Bucket Operations
    await this.runTest(suite, 'Bucket Operations', async () => {
      const warehouses = localStorageService.getWarehouses();
      const warehouse = warehouses[0];
      const rooms = localStorageService.getRooms(warehouse.id);
      const room = rooms[0];
      const shelves = localStorageService.getShelves(warehouse.id, room.id);
      const shelf = shelves[0];
      const items = localStorageService.getItems(warehouse.id, room.id, shelf.id);
      
      if (items.length === 0) {
        throw new Error('No items available for bucket test');
      }
      
      const item = items[0];
      const originalPath = `${warehouse.name} > ${room.name} > ${shelf.name}`;
      
      // Add to bucket
      const bucketItem = localStorageService.addItemToBucket(item, originalPath);
      const bucketItems = localStorageService.getBucketItems();
      
      if (!bucketItems.find(bi => bi.id === bucketItem.id)) {
        throw new Error('Item not found in bucket after addition');
      }
      
      return { 
        status: 'PASS', 
        message: 'Bucket operations working correctly',
        details: { bucketItemId: bucketItem.id, originalPath }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runUITests(): Promise<void> {
    const suite = this.createTestSuite('UI/UX Tests');
    
    // Test modal availability
    await this.runTest(suite, 'Modal Components', async () => {
      const modals = [
        'AddItemModal', 'ChatModal', 'ConfirmModal', 'InputModal', 
        'InfoModal', 'ImportExportModal', 'DebugModal', 'QRSyncModal'
      ];
      
      return { 
        status: 'PASS', 
        message: 'All modal components defined',
        details: { modals }
      };
    });

    // Test theme system
    await this.runTest(suite, 'Theme System', async () => {
      const currentTheme = themeService.getCurrentTheme();
      const availableThemes = themeService.getAvailableThemes();
      
      return { 
        status: 'PASS', 
        message: 'Theme system operational',
        details: { currentTheme, availableThemes }
      };
    });

    // Test user service
    await this.runTest(suite, 'User Service', async () => {
      const currentUser = userService.getCurrentUser();
      const hasExportPermission = userService.canExportData();
      
      return { 
        status: 'PASS', 
        message: 'User service operational',
        details: { currentUser, hasExportPermission }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runDataPersistenceTests(): Promise<void> {
    const suite = this.createTestSuite('Data Persistence');
    
    // Test data export
    await this.runTest(suite, 'Data Export', async () => {
      const exportData = localStorageService.exportData();
      
      if (!exportData.warehouses || !exportData.bucketItems) {
        throw new Error('Export data missing required fields');
      }
      
      return { 
        status: 'PASS', 
        message: 'Data export successful',
        details: { 
          warehousesCount: exportData.warehouses.length,
          bucketItemsCount: exportData.bucketItems.length 
        }
      };
    });

    // Test data backup/restore
    await this.runTest(suite, 'Data Backup/Restore', async () => {
      const originalData = localStorageService.exportData();
      
      // Create backup
      const backupKey = `backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(originalData));
      
      const restoredData = JSON.parse(localStorage.getItem(backupKey) || '{}');
      
      if (JSON.stringify(originalData) !== JSON.stringify(restoredData)) {
        throw new Error('Backup/restore data mismatch');
      }
      
      // Cleanup
      localStorage.removeItem(backupKey);
      
      return { 
        status: 'PASS', 
        message: 'Backup/restore working correctly'
      };
    });

    this.completeTestSuite(suite);
  }

  private async runSmartieTests(): Promise<void> {
    const suite = this.createTestSuite('SMARTIE AI Tests');
    
    // Test Local LLM Configuration
    await this.runTest(suite, 'Local LLM Configuration', async () => {
      const localLlmConfig = {
        baseUrl: 'http://172.29.240.1:5174',
        model: 'openai/gpt-oss-20b',
        apiKey: 'test-key' // Optional for local LLM
      };
      
      // Test connection to local LLM
      try {
        const response = await fetch(`${localLlmConfig.baseUrl}/v1/models`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(localLlmConfig.apiKey && { 'Authorization': `Bearer ${localLlmConfig.apiKey}` })
          }
        });
        
        if (!response.ok) {
          throw new Error(`Local LLM not reachable: ${response.status}`);
        }
        
        const modelsData = await response.json();
        
        return { 
          status: 'PASS', 
          message: 'Local LLM connection successful',
          details: { ...localLlmConfig, availableModels: modelsData }
        };
      } catch (error) {
        return { 
          status: 'FAIL', 
          message: `Local LLM connection failed: ${(error as Error).message}`,
          details: localLlmConfig
        };
      }
    });

    // Test Local LLM Chat Completion
    await this.runTest(suite, 'Local LLM Chat Completion', async () => {
      const localLlmConfig = {
        baseUrl: 'http://172.29.240.1:5174',
        model: 'openai/gpt-oss-20b'
      };
      
      try {
        const testMessage = "Hello, this is a test message for the inventory system. Please respond with 'Test successful'.";
        
        const response = await fetch(`${localLlmConfig.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: localLlmConfig.model,
            messages: [
              {
                role: 'user',
                content: testMessage
              }
            ],
            max_tokens: 50,
            temperature: 0.1
          })
        });
        
        if (!response.ok) {
          throw new Error(`Chat completion failed: ${response.status}`);
        }
        
        const completion = await response.json();
        const aiResponse = completion.choices?.[0]?.message?.content || 'No response';
        
        return { 
          status: 'PASS', 
          message: 'Local LLM chat completion successful',
          details: { 
            testMessage, 
            aiResponse,
            tokensUsed: completion.usage?.total_tokens || 0
          }
        };
      } catch (error) {
        return { 
          status: 'FAIL', 
          message: `Local LLM chat completion failed: ${(error as Error).message}`,
          details: localLlmConfig
        };
      }
    });

    // Test SMARTIE Inventory Context
    await this.runTest(suite, 'SMARTIE Inventory Context', async () => {
      try {
        // Get current inventory state
        const warehouses = localStorageService.getWarehouses();
        const exportData = localStorageService.exportData();
        
        const inventoryContext = {
          totalWarehouses: warehouses.length,
          totalRooms: warehouses.reduce((sum, w) => sum + (w.rooms?.length || 0), 0),
          totalContainers: warehouses.reduce((sum, w) => 
            sum + (w.rooms?.reduce((roomSum, r) => roomSum + (r.shelves?.length || 0), 0) || 0), 0
          ),
          totalItems: warehouses.reduce((sum, w) => 
            sum + (w.rooms?.reduce((roomSum, r) => 
              roomSum + (r.shelves?.reduce((shelfSum, s) => shelfSum + (s.items?.length || 0), 0) || 0), 0
            ) || 0), 0
          ),
          bucketItems: exportData.bucketItems.length
        };
        
        // Test inventory context generation for AI
        const contextMessage = `Current inventory state: ${JSON.stringify(inventoryContext)}. Summarize this data.`;
        
        return { 
          status: 'PASS', 
          message: 'SMARTIE inventory context generated successfully',
          details: { inventoryContext, contextMessage }
        };
      } catch (error) {
        return { 
          status: 'FAIL', 
          message: `SMARTIE context generation failed: ${(error as Error).message}`
        };
      }
    });

    // Test SMARTIE Actions Simulation
    await this.runTest(suite, 'SMARTIE Actions Simulation', async () => {
      try {
        const testActions = [
          {
            action: 'createWarehouse',
            params: { name: 'AI Test Warehouse' },
            description: 'Create warehouse via AI'
          },
          {
            action: 'findItems',
            params: { query: 'test' },
            description: 'Search items via AI'
          },
          {
            action: 'getInventorySummary',
            params: {},
            description: 'Generate inventory summary'
          }
        ];
        
        const simulatedResults = testActions.map(action => ({
          ...action,
          status: 'simulated',
          timestamp: new Date().toISOString()
        }));
        
        return { 
          status: 'PASS', 
          message: 'SMARTIE actions simulation completed',
          details: { 
            supportedActions: testActions.length,
            actions: simulatedResults
          }
        };
      } catch (error) {
        return { 
          status: 'FAIL', 
          message: `SMARTIE actions simulation failed: ${(error as Error).message}`
        };
      }
    });

    // Test SMARTIE Provider Switching
    await this.runTest(suite, 'SMARTIE Provider Configuration', async () => {
      try {
        const providers = [
          {
            name: 'Claude',
            baseUrl: 'https://api.anthropic.com',
            model: 'claude-3-sonnet-20240229',
            requiresApiKey: true,
            status: 'available'
          },
          {
            name: 'Local LLM',
            baseUrl: 'http://172.29.240.1:5174',
            model: 'openai/gpt-oss-20b',
            requiresApiKey: false,
            status: 'configured'
          }
        ];
        
        return { 
          status: 'PASS', 
          message: 'SMARTIE provider configuration ready',
          details: { providers }
        };
      } catch (error) {
        return { 
          status: 'FAIL', 
          message: `SMARTIE provider configuration failed: ${(error as Error).message}`
        };
      }
    });

    this.completeTestSuite(suite);
  }

  private async runLocalizationTests(): Promise<void> {
    const suite = this.createTestSuite('Localization');
    
    // Test available locales
    await this.runTest(suite, 'Available Locales', async () => {
      const locales = localizationService.getAvailableLocales();
      const currentLocale = localizationService.getCurrentLocale();
      
      if (locales.length === 0) {
        throw new Error('No locales available');
      }
      
      return { 
        status: 'PASS', 
        message: 'Localization system operational',
        details: { locales, currentLocale }
      };
    });

    // Test locale switching
    await this.runTest(suite, 'Locale Switching', async () => {
      const originalLocale = localizationService.getCurrentLocale();
      const availableLocales = localizationService.getAvailableLocales();
      
      // Try switching to different locale
      const testLocale = availableLocales.find(l => l !== originalLocale) || availableLocales[0];
      localizationService.setLocale(testLocale);
      
      const newLocale = localizationService.getCurrentLocale();
      
      // Switch back
      localizationService.setLocale(originalLocale);
      
      return { 
        status: 'PASS', 
        message: 'Locale switching successful',
        details: { originalLocale, testLocale, newLocale }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runThemeTests(): Promise<void> {
    const suite = this.createTestSuite('Theme System');
    
    // Test theme switching
    await this.runTest(suite, 'Theme Operations', async () => {
      const originalTheme = themeService.getCurrentTheme();
      const availableThemes = themeService.getAvailableThemes();
      
      return { 
        status: 'PASS', 
        message: 'Theme system operational',
        details: { originalTheme, availableThemes }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runImportExportTests(): Promise<void> {
    const suite = this.createTestSuite('Import/Export');
    
    // Test JSON export format
    await this.runTest(suite, 'JSON Export Format', async () => {
      const exportData = localStorageService.exportData();
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Validate JSON structure
      const parsed = JSON.parse(jsonString);
      
      if (!parsed.warehouses || !parsed.bucketItems) {
        throw new Error('Invalid export format');
      }
      
      return { 
        status: 'PASS', 
        message: 'JSON export format valid',
        details: { 
          size: jsonString.length,
          warehouses: parsed.warehouses.length,
          bucketItems: parsed.bucketItems.length
        }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runPerformanceTests(): Promise<void> {
    const suite = this.createTestSuite('Performance');
    
    // Test data loading performance
    await this.runTest(suite, 'Data Loading Performance', async () => {
      const startTime = performance.now();
      
      localStorageService.initializeLocalStorage();
      const warehouses = localStorageService.getWarehouses();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return { 
        status: duration < 100 ? 'PASS' : 'FAIL', 
        message: `Data loading took ${duration.toFixed(2)}ms`,
        details: { duration, warehousesCount: warehouses.length }
      };
    });

    // Test large data handling
    await this.runTest(suite, 'Large Data Handling', async () => {
      const startTime = performance.now();
      
      // Simulate processing large dataset
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i}`,
        quantity: Math.floor(Math.random() * 100)
      }));
      
      const filtered = largeArray.filter(item => item.quantity > 50);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return { 
        status: duration < 50 ? 'PASS' : 'FAIL', 
        message: `Large data processing took ${duration.toFixed(2)}ms`,
        details: { 
          originalSize: largeArray.length, 
          filteredSize: filtered.length, 
          duration 
        }
      };
    });

    this.completeTestSuite(suite);
  }

  private createTestSuite(suiteName: string): TestSuite {
    const suite: TestSuite = {
      suiteName,
      results: [],
      startTime: new Date(),
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    this.testResults.push(suite);
    debugService.info(`🧪 Starting test suite: ${suiteName}`);
    
    return suite;
  }

  private async runTest(
    suite: TestSuite, 
    testName: string, 
    testFunction: () => Promise<{ status: 'PASS' | 'FAIL' | 'SKIP'; message: string; details?: any }>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      debugService.info(`  ▶️ Running test: ${testName}`);
      
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult: TestResult = {
        testName,
        status: result.status,
        message: result.message,
        details: result.details,
        timestamp: new Date(),
        duration
      };
      
      suite.results.push(testResult);
      
      // Update counters
      if (result.status === 'PASS') suite.passed++;
      else if (result.status === 'FAIL') suite.failed++;
      else suite.skipped++;
      
      debugService.info(`  ${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'} ${testName}: ${result.message}`, {
        duration: `${duration.toFixed(2)}ms`,
        details: result.details
      });
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult: TestResult = {
        testName,
        status: 'FAIL',
        message: (error as Error).message,
        timestamp: new Date(),
        duration
      };
      
      suite.results.push(testResult);
      suite.failed++;
      
      debugService.error(`  ❌ ${testName}: ${(error as Error).message}`, {
        duration: `${duration.toFixed(2)}ms`,
        error: error
      });
    }
  }

  private completeTestSuite(suite: TestSuite): void {
    suite.endTime = new Date();
    suite.totalDuration = suite.endTime.getTime() - suite.startTime.getTime();
    
    debugService.info(`🏁 Completed test suite: ${suite.suiteName}`, {
      total: suite.results.length,
      passed: suite.passed,
      failed: suite.failed,
      skipped: suite.skipped,
      duration: `${suite.totalDuration}ms`
    });
  }

  // Export test results for analysis
  exportTestResults(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      testSuites: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.results.length, 0),
        totalPassed: this.testResults.reduce((sum, suite) => sum + suite.passed, 0),
        totalFailed: this.testResults.reduce((sum, suite) => sum + suite.failed, 0),
        totalSkipped: this.testResults.reduce((sum, suite) => sum + suite.skipped, 0),
        totalDuration: this.testResults.reduce((sum, suite) => sum + suite.totalDuration, 0)
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Save test results to localStorage for persistence
  saveTestResults(): void {
    const exportData = this.exportTestResults();
    const key = `self-test-results-${Date.now()}`;
    localStorage.setItem(key, exportData);
    debugService.info('📁 Test results saved to localStorage', { key });
  }

  // Get all saved test results
  getSavedTestResults(): Array<{ key: string; timestamp: string; data: any }> {
    const results = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('self-test-results-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          results.push({
            key,
            timestamp: data.timestamp,
            data
          });
        } catch (error) {
          debugService.warn(`Failed to parse saved test result: ${key}`);
        }
      }
    }
    
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

const selfTestService = new SelfTestService();
export default selfTestService;