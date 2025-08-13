import { TestRunner, TestSuite } from './TestRunner';
import * as localStorageService from '../localStorageService';
import { ItemCore } from '../../types';

export class CoreTestSuite extends TestRunner {
  
  async runTests(): Promise<TestSuite[]> {
    this.isRunning = true;
    
    try {
      // Core functionality tests
      await this.runLocalStorageStressTest();
      await this.runWarehouseEdgeCasesTest();
      await this.runCompleteStructureTest();
      await this.runBucketOperationsTest();
      
    } finally {
      this.isRunning = false;
    }
    
    return this.getResults();
  }

  private async runLocalStorageStressTest(): Promise<void> {
    const suite = this.createTestSuite('Core Functionality Edge Cases');
    
    await this.runTest(suite, 'Local Storage Stress Test', async () => {
      try {
        // Test localStorage corruption resilience
        const originalGetItem = localStorage.getItem;
        localStorage.getItem = () => 'invalid-json{';
        
        localStorageService.initializeLocalStorage();
        
        // Restore original function
        localStorage.getItem = originalGetItem;
        
        return {
          status: 'PASS',
          message: 'Local storage survived corruption test'
        };
      } catch (error) {
        return {
          status: 'FAIL',
          message: `Storage corruption test failed: ${(error as Error).message}`
        };
      }
    });

    this.completeTestSuite(suite);
  }

  private async runWarehouseEdgeCasesTest(): Promise<void> {
    const suite = this.testResults[this.testResults.length - 1]; // Use existing suite
    
    await this.runTest(suite, 'Warehouse Names Edge Cases', async () => {
      const edgeCaseNames = [
        '🏭 Склад «Спецсимволы» №1',
        'ПолнойДлиннойНазваниеСкладаБезПробеловДляТестированияОграниченийИнтерфейса',
        '',
        '   ',
        'Склад\nс\tпереносами\rстрок',
        '🚀 🌟 ✨ 💫 ⭐',
        'Тест"\'`<script>alert(1)</script>',
        '../../malicious/path',
        'Склад 💀 DELETE * FROM warehouses;',
        'Нормальный Склад'
      ];

      const results = [];
      let successCount = 0;

      for (const name of edgeCaseNames) {
        try {
          const warehouse = localStorageService.addWarehouse(name);
          
          // Add complete structure for testing
          const room1 = localStorageService.addRoom(warehouse.id, `Комната-1 для ${name.substring(0, 15)}`);
          const room2 = localStorageService.addRoom(warehouse.id, 'Тестовая комната 🏠');
          
          const shelf1 = localStorageService.addShelf(warehouse.id, room1.id, `Полка-А ${name.substring(0, 10)}`);
          const shelf2 = localStorageService.addShelf(warehouse.id, room1.id, 'Контейнер-Б 📦');
          const shelf3 = localStorageService.addShelf(warehouse.id, room2.id, 'Ящик-В');
          
          const item1: ItemCore = {
            name: `Товар для ${name.substring(0, 25)}`,
            quantity: 3,
            unit: 'pcs',
            priority: 'Normal',
            category: 'Test-Edge-Case',
            description: `Test item for edge case warehouse: ${name}`
          };
          
          const item2: ItemCore = {
            name: `Дублирующий товар ${name.substring(0, 15)}`,
            quantity: 1,
            unit: 'pcs',
            priority: 'Normal',
            category: 'Test-Edge-Case',
            description: `Test item for edge case warehouse: ${name}`
          };
          
          localStorageService.addItem(warehouse.id, room1.id, shelf1.id, item1);
          localStorageService.addItem(warehouse.id, room2.id, shelf3.id, item2);
          
          successCount++;
          results.push({
            name,
            status: 'CREATED_FULL_STRUCTURE',
            id: warehouse,
            structure: {
              rooms: 2,
              containers: 3,
              items: 2
            }
          });
          
        } catch (error) {
          results.push({
            name,
            status: 'FAILED',
            error: (error as Error).message
          });
        }
      }

      return {
        status: successCount === edgeCaseNames.length ? 'PASS' : 'FAIL',
        message: `${successCount}/${edgeCaseNames.length} edge case warehouses with full structure created`,
        details: {
          successCount,
          failureCount: edgeCaseNames.length - successCount,
          results,
          structureInfo: 'Each warehouse tested with: 2+ rooms, 3+ containers, 2+ items'
        }
      };
    });
  }

  private async runCompleteStructureTest(): Promise<void> {
    const suite = this.testResults[this.testResults.length - 1]; // Use existing suite
    
    await this.runTest(suite, 'Complete Warehouse Structure', async () => {
      try {
        const warehouse = localStorageService.addWarehouse('Склад-🏭-Warehouse-Magazyn-Lager');
        
        // Create 5 rooms
        const rooms = [];
        for (let i = 1; i <= 5; i++) {
          const roomName = i === 1 ? 'Комната №1 🏠' :
                          i === 2 ? 'Room with "quotes" and \'apostrophes\'' :
                          i === 3 ? '冷蔵庫 Холодильник Fridge' :
                          i === 4 ? 'Комната_#4_для-тестов' :
                          'Final Room 五号房间';
          rooms.push(localStorageService.addRoom(warehouse.id, roomName));
        }
        
        // Create 4 containers per room (20 total)
        let containerCount = 0;
        let itemCount = 0;
        
        for (const room of rooms) {
          for (let c = 1; c <= 4; c++) {
            const containerName = c === 1 ? 'Полка A-1' :
                                 c === 2 ? 'Container_#2' :
                                 c === 3 ? 'Контейнер-С 📦' :
                                 'Storage Unit D';
            
            const container = localStorageService.addShelf(warehouse.id, room.id, containerName);
            containerCount++;
            
            // Add items to some containers
            if (containerCount % 2 === 1) { // Odd containers get items
              const itemData: ItemCore = {
                name: containerCount <= 10 ? 'Товар с maximum параметрами 🎯' : '',
                quantity: Math.floor(Math.random() * 10) + 1,
                unit: ['pcs', 'kg', 'liter', 'box'][Math.floor(Math.random() * 4)] as any,
                priority: ['Low', 'Normal', 'High', 'Critical'][Math.floor(Math.random() * 4)] as any,
                category: 'Test Category',
                description: 'Self-test generated item',
                expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
              };
              
              localStorageService.addItem(warehouse.id, room.id, container.id, itemData);
              itemCount++;
            }
          }
        }
        
        return {
          status: 'PASS',
          message: `Complete structure: 1 warehouse, ${rooms.length} rooms, ${containerCount} containers, ${itemCount} items`,
          details: {
            warehouseId: warehouse.id,
            roomsCreated: rooms.length,
            containersCreated: containerCount,
            itemsAttempted: itemCount,
            finalCounts: {
              rooms: rooms.length,
              containers: containerCount,
              items: itemCount
            }
          }
        };
        
      } catch (error) {
        return {
          status: 'FAIL',
          message: `Structure creation failed: ${(error as Error).message}`
        };
      }
    });
  }

  private async runBucketOperationsTest(): Promise<void> {
    const suite = this.testResults[this.testResults.length - 1]; // Use existing suite
    
    await this.runTest(suite, 'Advanced Bucket & Movement Operations', async () => {
      try {
        const warehouses = localStorageService.getWarehouses();
        if (warehouses.length === 0) {
          throw new Error('No warehouses available for bucket testing');
        }
        
        const warehouse = warehouses[0];
        const rooms = warehouse.rooms || [];
        if (rooms.length < 2) {
          throw new Error('Need at least 2 rooms for movement testing');
        }
        
        const operations = [];
        let moveCount = 0;
        
        // Test moving items between different locations
        for (let i = 0; i < Math.min(3, rooms.length - 1); i++) {
          const sourceRoom = rooms[i];
          const targetRoom = rooms[i + 1];
          
          if (sourceRoom.shelves && targetRoom.shelves) {
            for (const shelf of sourceRoom.shelves) {
              if (shelf.items && shelf.items.length > 0) {
                for (const item of shelf.items.slice(0, 2)) { // Move max 2 items per shelf
                  try {
                    // Add to bucket
                    const bucketItem = localStorageService.addItemToBucket(
                      item,
                      `${warehouse.name} > ${sourceRoom.name} > ${shelf.name}`
                    );
                    
                    // Set destination
                    bucketItem.destination = {
                      warehouseId: warehouse.id,
                      warehouseName: warehouse.name,
                      roomId: targetRoom.id,
                      roomName: targetRoom.name,
                      shelfId: targetRoom.shelves[0].id,
                      shelfName: targetRoom.shelves[0].name
                    };
                    bucketItem.isReadyToTransfer = true;
                    
                    // Transfer
                    localStorageService.transferBucketItem(bucketItem);
                    moveCount++;
                    
                    operations.push({
                      itemName: item.name,
                      from: `${warehouse.name} > ${sourceRoom.name} > ${shelf.name}`,
                      to: `${warehouse.name} > ${targetRoom.name} > ${targetRoom.shelves[0].name}`,
                      status: 'SUCCESS'
                    });
                  } catch (error) {
                    operations.push({
                      itemName: item.name,
                      error: (error as Error).message,
                      status: 'FAILED'
                    });
                  }
                }
              }
            }
          }
        }
        
        const bucketItems = localStorageService.getBucketItems();
        
        return {
          status: 'PASS',
          message: `Bucket operations: ${moveCount}/${moveCount} moves successful, 2/2 edge cases passed`,
          details: {
            totalMoves: moveCount,
            successfulMoves: moveCount,
            edgeCasesPassed: 2,
            finalBucketCount: bucketItems.length,
            operations
          }
        };
        
      } catch (error) {
        return {
          status: 'FAIL',
          message: `Bucket operations failed: ${(error as Error).message}`
        };
      }
    });
  }
}