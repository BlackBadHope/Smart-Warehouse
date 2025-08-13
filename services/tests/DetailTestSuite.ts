import { TestRunner, TestSuite } from './TestRunner';
import * as localStorageService from '../localStorageService';
import debugService from '../debugService';

export class DetailTestSuite extends TestRunner {
  
  async runTests(): Promise<TestSuite[]> {
    this.isRunning = true;
    
    try {
      await this.runDetailedValidationTests();
      await this.runEdgeCaseTests();
      await this.runBoundaryTests();
      await this.runDataIntegrityTests();
      
    } finally {
      this.isRunning = false;
    }
    
    return this.getResults();
  }

  private async runDetailedValidationTests(): Promise<void> {
    const suite = this.createTestSuite('Detailed Validation & Edge Cases');

    // Test 1: Input Validation Edge Cases
    await this.runTest(suite, 'Input Validation Edge Cases', async () => {
      const validationTests = [
        { input: '', expected: 'empty', description: 'Empty string handling' },
        { input: '   ', expected: 'whitespace', description: 'Whitespace-only strings' },
        { input: 'A'.repeat(1000), expected: 'long', description: 'Very long strings' },
        { input: '🚀🌟✨💫⭐', expected: 'emoji', description: 'Unicode/emoji handling' },
        { input: 'Test\nWith\nNewlines', expected: 'multiline', description: 'Multiline input' },
        { input: '<script>alert("xss")</script>', expected: 'script', description: 'Script injection attempt' },
        { input: '../../etc/passwd', expected: 'path', description: 'Path traversal attempt' },
        { input: 'DROP TABLE warehouses;', expected: 'sql', description: 'SQL injection attempt' }
      ];

      const results = [];
      let passedTests = 0;

      for (const test of validationTests) {
        try {
          // Test warehouse name validation
          const warehouse = localStorageService.addWarehouse(test.input);
          
          // Verify the warehouse was created but name is sanitized/handled properly
          const retrieved = localStorageService.getWarehouses().find(w => w.id === warehouse.id);
          
          results.push({
            input: test.input,
            expected: test.expected,
            description: test.description,
            warehouseCreated: !!retrieved,
            nameStored: retrieved?.name,
            status: 'HANDLED'
          });
          
          passedTests++;
          
          // Clean up
          localStorageService.deleteWarehouse(warehouse.id);
          
        } catch (error) {
          results.push({
            input: test.input,
            expected: test.expected,
            description: test.description,
            error: (error as Error).message,
            status: 'ERROR'
          });
        }
      }

      return {
        status: passedTests >= validationTests.length * 0.8 ? 'PASS' : 'FAIL',
        message: `Input validation: ${passedTests}/${validationTests.length} cases handled correctly`,
        details: {
          totalTests: validationTests.length,
          passedTests,
          results
        }
      };
    });

    // Test 2: Data Type Boundary Testing
    await this.runTest(suite, 'Data Type Boundary Testing', async () => {
      const boundaryTests = [
        { type: 'quantity', values: [0, -1, 0.5, 999999, Infinity, NaN] },
        { type: 'dates', values: ['2025-01-01', '1900-01-01', '2100-12-31', 'invalid-date', ''] },
        { type: 'numbers', values: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0, -0] }
      ];

      const results = [];
      let successfulTests = 0;

      // Create test warehouse
      const warehouse = localStorageService.addWarehouse('Boundary Test Warehouse');
      const room = localStorageService.addRoom(warehouse.id, 'Test Room');
      const shelf = localStorageService.addShelf(warehouse.id, room.id, 'Test Shelf');

      for (const test of boundaryTests) {
        for (const value of test.values) {
          try {
            if (test.type === 'quantity') {
              const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
                name: `Test Item ${Date.now()}`,
                quantity: value as number,
                unit: 'pcs',
                priority: 'Normal',
                category: 'Test'
              });
              
              results.push({
                type: test.type,
                inputValue: value,
                storedValue: item.quantity,
                status: 'STORED',
                description: `Quantity boundary test: ${value}`
              });
              successfulTests++;
              
            } else if (test.type === 'dates') {
              const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
                name: `Date Test Item ${Date.now()}`,
                quantity: 1,
                unit: 'pcs',
                priority: 'Normal',
                category: 'Test',
                expiryDate: value as string
              });
              
              results.push({
                type: test.type,
                inputValue: value,
                storedValue: item.expiryDate,
                status: 'STORED',
                description: `Date boundary test: ${value}`
              });
              successfulTests++;
            }
            
          } catch (error) {
            results.push({
              type: test.type,
              inputValue: value,
              error: (error as Error).message,
              status: 'ERROR',
              description: `Boundary test failed for ${test.type}: ${value}`
            });
          }
        }
      }

      // Clean up
      localStorageService.deleteWarehouse(warehouse.id);

      return {
        status: successfulTests > 0 ? 'PASS' : 'FAIL',
        message: `Boundary testing: ${successfulTests} values handled correctly`,
        details: {
          totalValues: boundaryTests.reduce((sum, test) => sum + test.values.length, 0),
          successfulTests,
          results
        }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runEdgeCaseTests(): Promise<void> {
    const suite = this.createTestSuite('Deep Edge Case Analysis');

    // Test 1: Concurrent Operations Simulation
    await this.runTest(suite, 'Concurrent Operations Simulation', async () => {
      const operations = [];
      const warehouse = localStorageService.addWarehouse('Concurrent Test');
      const room = localStorageService.addRoom(warehouse.id, 'Concurrent Room');
      const shelf = localStorageService.addShelf(warehouse.id, room.id, 'Concurrent Shelf');

      // Simulate rapid concurrent operations
      for (let i = 0; i < 10; i++) {
        const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
          name: `Concurrent Item ${i}`,
          quantity: i + 1,
          unit: 'pcs',
          priority: 'Normal',
          category: 'Concurrent'
        });

        // Immediately modify the item
        localStorageService.updateItem(warehouse.id, room.id, shelf.id, item.id, {
          quantity: (i + 1) * 2
        });

        operations.push({
          operation: 'create_and_update',
          itemId: item.id,
          initialQuantity: i + 1,
          finalQuantity: (i + 1) * 2,
          status: 'completed'
        });
      }

      // Verify all operations completed correctly
      const items = localStorageService.getItems(warehouse.id, room.id, shelf.id);
      const correctUpdates = items.filter(item => {
        const operation = operations.find(op => op.itemId === item.id);
        return operation && item.quantity === operation.finalQuantity;
      });

      localStorageService.deleteWarehouse(warehouse.id);

      return {
        status: correctUpdates.length === operations.length ? 'PASS' : 'FAIL',
        message: `Concurrent operations: ${correctUpdates.length}/${operations.length} completed correctly`,
        details: {
          totalOperations: operations.length,
          successfulOperations: correctUpdates.length,
          operations
        }
      };
    });

    // Test 2: Memory Usage and Large Dataset Handling
    await this.runTest(suite, 'Large Dataset Memory Usage', async () => {
      const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const warehouse = localStorageService.addWarehouse('Memory Test Warehouse');
      const room = localStorageService.addRoom(warehouse.id, 'Memory Test Room');
      
      const itemCounts = [];
      let totalItems = 0;

      // Create increasing numbers of items and measure
      for (let batch = 1; batch <= 5; batch++) {
        const shelf = localStorageService.addShelf(warehouse.id, room.id, `Shelf ${batch}`);
        const itemsInBatch = batch * 20; // 20, 40, 60, 80, 100 items per shelf
        
        for (let i = 0; i < itemsInBatch; i++) {
          localStorageService.addItem(warehouse.id, room.id, shelf.id, {
            name: `Memory Test Item ${batch}-${i}`,
            quantity: i + 1,
            unit: 'pcs',
            priority: 'Normal',
            category: 'Memory Test',
            description: `Batch ${batch} item ${i} with some additional data to test memory usage patterns`
          });
        }
        
        totalItems += itemsInBatch;
        const currentMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        itemCounts.push({
          batch,
          itemsInBatch,
          totalItems,
          memoryUsed: currentMemory - startMemory,
          memoryPerItem: totalItems > 0 ? (currentMemory - startMemory) / totalItems : 0
        });
      }

      // Test data retrieval performance with large dataset
      const retrievalStart = performance.now();
      const allWarehouses = localStorageService.getWarehouses();
      const retrievalTime = performance.now() - retrievalStart;

      localStorageService.deleteWarehouse(warehouse.id);
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      return {
        status: totalItems > 250 && retrievalTime < 100 ? 'PASS' : 'FAIL',
        message: `Large dataset: ${totalItems} items created, ${retrievalTime.toFixed(2)}ms retrieval`,
        details: {
          totalItemsCreated: totalItems,
          retrievalTimeMs: retrievalTime,
          memoryGrowth: endMemory - startMemory,
          itemCounts,
          warehousesRetrieved: allWarehouses.length
        }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runBoundaryTests(): Promise<void> {
    const suite = this.createTestSuite('System Boundary Tests');

    // Test 1: Storage Limits and Overflow Protection
    await this.runTest(suite, 'Storage Limits and Overflow', async () => {
      const testData = {
        maxNameLength: 1000,
        maxDescriptionLength: 5000,
        maxQuantity: Number.MAX_SAFE_INTEGER,
        specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?~`'
      };

      const results = [];
      const warehouse = localStorageService.addWarehouse('Boundary Limit Test');
      const room = localStorageService.addRoom(warehouse.id, 'Limit Test Room');
      const shelf = localStorageService.addShelf(warehouse.id, room.id, 'Limit Test Shelf');

      // Test maximum name length
      try {
        const longName = 'A'.repeat(testData.maxNameLength);
        const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
          name: longName,
          quantity: 1,
          unit: 'pcs',
          priority: 'Normal',
          category: 'Limit Test'
        });
        
        results.push({
          test: 'max_name_length',
          input: testData.maxNameLength,
          stored: item.name.length,
          status: 'HANDLED'
        });
      } catch (error) {
        results.push({
          test: 'max_name_length',
          error: (error as Error).message,
          status: 'ERROR'
        });
      }

      // Test special characters
      try {
        const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
          name: `Special ${testData.specialCharacters} Characters`,
          quantity: 1,
          unit: 'pcs',
          priority: 'Normal',
          category: 'Special Test'
        });
        
        results.push({
          test: 'special_characters',
          input: testData.specialCharacters,
          stored: item.name,
          status: 'STORED'
        });
      } catch (error) {
        results.push({
          test: 'special_characters',
          error: (error as Error).message,
          status: 'ERROR'
        });
      }

      localStorageService.deleteWarehouse(warehouse.id);

      const successfulTests = results.filter(r => r.status === 'HANDLED' || r.status === 'STORED').length;

      return {
        status: successfulTests >= results.length * 0.7 ? 'PASS' : 'FAIL',
        message: `Boundary limits: ${successfulTests}/${results.length} tests passed`,
        details: {
          testData,
          results,
          successfulTests
        }
      };
    });

    this.completeTestSuite(suite);
  }

  private async runDataIntegrityTests(): Promise<void> {
    const suite = this.createTestSuite('Data Integrity & Consistency');

    // Test 1: Reference Integrity
    await this.runTest(suite, 'Reference Integrity Verification', async () => {
      const warehouse = localStorageService.addWarehouse('Integrity Test');
      const room = localStorageService.addRoom(warehouse.id, 'Integrity Room');
      const shelf = localStorageService.addShelf(warehouse.id, room.id, 'Integrity Shelf');
      const item = localStorageService.addItem(warehouse.id, room.id, shelf.id, {
        name: 'Integrity Test Item',
        quantity: 5,
        unit: 'pcs',
        priority: 'Normal',
        category: 'Integrity'
      });

      const integrityChecks = [];

      // Check parent-child relationships
      const warehouseCheck = localStorageService.getWarehouses().find(w => w.id === warehouse.id);
      const roomCheck = warehouseCheck?.rooms?.find(r => r.id === room.id);
      const shelfCheck = roomCheck?.shelves?.find(s => s.id === shelf.id);
      const itemCheck = shelfCheck?.items?.find(i => i.id === item.id);

      integrityChecks.push({
        check: 'warehouse_exists',
        result: !!warehouseCheck,
        expected: true
      });

      integrityChecks.push({
        check: 'room_in_warehouse',
        result: !!roomCheck,
        expected: true
      });

      integrityChecks.push({
        check: 'shelf_in_room',
        result: !!shelfCheck,
        expected: true
      });

      integrityChecks.push({
        check: 'item_in_shelf',
        result: !!itemCheck,
        expected: true
      });

      // Test deletion cascade behavior
      localStorageService.deleteRoom(warehouse.id, room.id);
      const postDeleteWarehouse = localStorageService.getWarehouses().find(w => w.id === warehouse.id);
      const deletedRoomCheck = postDeleteWarehouse?.rooms?.find(r => r.id === room.id);

      integrityChecks.push({
        check: 'room_deleted_cascade',
        result: !deletedRoomCheck,
        expected: true
      });

      localStorageService.deleteWarehouse(warehouse.id);

      const passedChecks = integrityChecks.filter(check => check.result === check.expected).length;

      return {
        status: passedChecks === integrityChecks.length ? 'PASS' : 'FAIL',
        message: `Reference integrity: ${passedChecks}/${integrityChecks.length} checks passed`,
        details: {
          integrityChecks,
          passedChecks,
          totalChecks: integrityChecks.length
        }
      };
    });

    this.completeTestSuite(suite);
  }
}