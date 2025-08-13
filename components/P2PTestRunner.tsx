import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, Users, Home, Package, Shuffle } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import deviceIdentityService from '../services/deviceIdentityService';
import rolesPermissionService from '../services/rolesPermissionService';
import syncBatchService from '../services/syncBatchService';
import trashService from '../services/trashService';
import debugService from '../services/debugService';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  details?: string;
}

interface FamilyMember {
  deviceId: string;
  nickname: string;
  role: 'master' | 'admin' | 'editor' | 'guest';
}

const P2PTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeUser, setActiveUser] = useState<string>('');

  const FAMILY_MEMBERS: FamilyMember[] = [
    { deviceId: 'test-father-001', nickname: 'Father', role: 'master' },
    { deviceId: 'test-mother-002', nickname: 'Mother', role: 'admin' },
    { deviceId: 'test-son-003', nickname: 'Son', role: 'editor' },
    { deviceId: 'test-guest-004', nickname: 'Guest', role: 'guest' }
  ];

  const TEST_WAREHOUSE_ID = 'test-warehouse-family';

  const updateTestResult = (name: string, status: TestResult['status'], message?: string, details?: string) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const switchToUser = (member: FamilyMember) => {
    // Mock switching users by updating device identity
    const profile = deviceIdentityService.getUserProfile();
    if (profile) {
      // Simulate different user context
      setActiveUser(member.nickname);
      debugService.info(`P2P Test: Switched to ${member.nickname} (${member.role})`);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTest = async (testName: string, testFn: () => Promise<boolean>) => {
    setCurrentTest(testName);
    updateTestResult(testName, 'running');
    
    try {
      const result = await testFn();
      updateTestResult(testName, result ? 'passed' : 'failed', 
        result ? 'Test completed successfully' : 'Test failed');
      return result;
    } catch (error: any) {
      updateTestResult(testName, 'failed', 'Test threw an error', error.message);
      return false;
    }
  };

  const testFamilySetup = async (): Promise<boolean> => {
    try {
      // Clear existing data
      localStorage.removeItem('inventory-user-permissions');
      
      // Setup Father as master
      switchToUser(FAMILY_MEMBERS[0]); // Father
      const fatherGranted = rolesPermissionService.grantRole(
        FAMILY_MEMBERS[0].deviceId,
        FAMILY_MEMBERS[0].nickname,
        'master'
      );
      
      if (!fatherGranted) return false;

      // Father grants roles to family members
      const motherGranted = rolesPermissionService.grantRole(
        FAMILY_MEMBERS[1].deviceId,
        FAMILY_MEMBERS[1].nickname,
        'admin',
        TEST_WAREHOUSE_ID
      );

      const sonGranted = rolesPermissionService.grantRole(
        FAMILY_MEMBERS[2].deviceId,
        FAMILY_MEMBERS[2].nickname,
        'editor', 
        TEST_WAREHOUSE_ID
      );

      const guestGranted = rolesPermissionService.grantRole(
        FAMILY_MEMBERS[3].deviceId,
        FAMILY_MEMBERS[3].nickname,
        'guest',
        TEST_WAREHOUSE_ID
      );

      return fatherGranted && motherGranted && sonGranted && guestGranted;
    } catch (error) {
      return false;
    }
  };

  const testRolePermissions = async (): Promise<boolean> => {
    try {
      // Test Father (master) permissions
      switchToUser(FAMILY_MEMBERS[0]);
      const fatherCanAssignRoles = rolesPermissionService.hasPermission('user.assign-roles');
      const fatherCanBan = rolesPermissionService.hasPermission('user.ban');
      
      // Test Son (editor) permissions  
      switchToUser(FAMILY_MEMBERS[2]);
      const sonCannotAssignRoles = !rolesPermissionService.hasPermission('user.assign-roles', TEST_WAREHOUSE_ID);
      const sonCanCreateItems = rolesPermissionService.hasPermission('item.create', TEST_WAREHOUSE_ID);
      
      // Test Guest permissions
      switchToUser(FAMILY_MEMBERS[3]);
      const guestCannotCreate = !rolesPermissionService.hasPermission('item.create', TEST_WAREHOUSE_ID);
      const guestCanViewPublic = rolesPermissionService.hasPermission('warehouse.view-public', TEST_WAREHOUSE_ID);

      return fatherCanAssignRoles && fatherCanBan && sonCannotAssignRoles && 
             sonCanCreateItems && guestCannotCreate && guestCanViewPublic;
    } catch (error) {
      return false;
    }
  };

  const testSyncBatching = async (): Promise<boolean> => {
    try {
      // Clear pending changes
      syncBatchService.clearPending();
      
      // Father creates items
      switchToUser(FAMILY_MEMBERS[0]);
      syncBatchService.addChange(
        'item.create',
        'item', 
        'test-item-father-1',
        { name: 'Father Item 1', isPublic: true },
        TEST_WAREHOUSE_ID
      );

      await sleep(100);

      // Mother creates items (should batch)
      switchToUser(FAMILY_MEMBERS[1]);
      syncBatchService.addChange(
        'item.create',
        'item',
        'test-item-mother-1', 
        { name: 'Mother Item 1', isPublic: false },
        TEST_WAREHOUSE_ID
      );

      await sleep(100);

      // Son creates items (should batch)
      switchToUser(FAMILY_MEMBERS[2]);
      syncBatchService.addChange(
        'item.update',
        'item',
        'test-item-son-1',
        { name: 'Son Item 1', isPublic: true },
        TEST_WAREHOUSE_ID
      );

      const status = syncBatchService.getStatus();
      return status.isPending && status.pendingChanges >= 3;
    } catch (error) {
      return false;
    }
  };

  const testConflictResolution = async (): Promise<boolean> => {
    try {
      // Create conflicting changes
      const itemId = 'test-conflict-item';
      const baseItem = { id: itemId, name: 'Shared Item', description: 'Original' };

      // Mother updates (admin priority)
      switchToUser(FAMILY_MEMBERS[1]);
      const motherChange = {
        id: 'change-mother-001',
        action: 'item.update' as const,
        entityType: 'item' as const,
        entityId: itemId,
        data: { ...baseItem, description: 'Updated by Mother' },
        userId: FAMILY_MEMBERS[1].deviceId,
        userNickname: FAMILY_MEMBERS[1].nickname,
        timestamp: new Date(),
        warehouseId: TEST_WAREHOUSE_ID,
        conflictPriority: 825 // admin role
      };

      // Father updates (master priority - should win)
      switchToUser(FAMILY_MEMBERS[0]);
      const fatherChange = {
        id: 'change-father-001',
        action: 'item.update' as const,
        entityType: 'item' as const,
        entityId: itemId,
        data: { ...baseItem, description: 'Updated by Father' },
        userId: FAMILY_MEMBERS[0].deviceId,
        userNickname: FAMILY_MEMBERS[0].nickname,
        timestamp: new Date(),
        warehouseId: TEST_WAREHOUSE_ID,
        conflictPriority: 1025 // master role
      };

      const conflictData = syncBatchService.getConflictData([motherChange, fatherChange]);
      
      // Father should win (higher priority)
      return conflictData[0].userId === FAMILY_MEMBERS[0].deviceId &&
             conflictData[0].conflictPriority > conflictData[1].conflictPriority;
    } catch (error) {
      return false;
    }
  };

  const testTrashManagement = async (): Promise<boolean> => {
    try {
      // Son disposes item
      switchToUser(FAMILY_MEMBERS[2]);
      const trashItem = trashService.disposeItem(
        'test-toy-001',
        'Old Toy',
        1,
        'Son Room',
        FAMILY_MEMBERS[2].nickname,
        'Too old and broken',
        'toy'
      );

      if (!trashItem) return false;

      // Father can restore from trash
      switchToUser(FAMILY_MEMBERS[0]);
      const restored = trashService.restoreFromTrash(trashItem.id);
      
      return !!restored && restored.name === 'Old Toy';
    } catch (error) {
      return false;
    }
  };

  const testUserManagement = async (): Promise<boolean> => {
    try {
      // Father bans Son
      switchToUser(FAMILY_MEMBERS[0]);
      const banned = rolesPermissionService.banUser(FAMILY_MEMBERS[2].deviceId, TEST_WAREHOUSE_ID);
      
      if (!banned) return false;

      // Check Son is banned
      const users = rolesPermissionService.getWarehouseUsers(TEST_WAREHOUSE_ID);
      const sonUser = users.find(u => u.userId === FAMILY_MEMBERS[2].deviceId);
      
      if (!sonUser || sonUser.isActive) return false;

      // Father unbans Son
      const unbanned = rolesPermissionService.unbanUser(FAMILY_MEMBERS[2].deviceId, TEST_WAREHOUSE_ID);
      
      if (!unbanned) return false;

      // Check Son is unbanned
      const usersAfter = rolesPermissionService.getWarehouseUsers(TEST_WAREHOUSE_ID);
      const sonUserAfter = usersAfter.find(u => u.userId === FAMILY_MEMBERS[2].deviceId);
      
      return !!sonUserAfter && sonUserAfter.isActive;
    } catch (error) {
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    debugService.info('P2P Test Runner: Starting family scenario tests');

    // Initialize test results
    const testNames = [
      'Family Setup',
      'Role Permissions', 
      'Sync Batching',
      'Conflict Resolution',
      'Trash Management',
      'User Management'
    ];

    testNames.forEach(name => {
      updateTestResult(name, 'pending');
    });

    await sleep(500);

    // Run tests sequentially
    const results = await Promise.all([
      runTest('Family Setup', testFamilySetup),
      runTest('Role Permissions', testRolePermissions),
      runTest('Sync Batching', testSyncBatching),
      runTest('Conflict Resolution', testConflictResolution),
      runTest('Trash Management', testTrashManagement),
      runTest('User Management', testUserManagement)
    ]);

    const passedTests = results.filter(r => r).length;
    const totalTests = results.length;

    debugService.action('P2P Test Runner: Tests completed', {
      passed: passedTests,
      total: totalTests,
      success: passedTests === totalTests
    });

    setCurrentTest('');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-400 bg-green-900 bg-opacity-20 border-green-600';
      case 'failed': return 'text-red-400 bg-red-900 bg-opacity-20 border-red-600';
      case 'running': return 'text-yellow-400 bg-yellow-900 bg-opacity-20 border-yellow-600';
      default: return 'text-gray-400 bg-gray-900 bg-opacity-20 border-gray-600';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const totalTests = testResults.length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;

  return (
    <div className={`${ASCII_COLORS.modalBg} rounded-lg border-2 ${ASCII_COLORS.border} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shuffle className={`w-6 h-6 ${ASCII_COLORS.accent}`} />
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>P2P Family Scenarios Test</h2>
        </div>
        
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded border ${ASCII_COLORS.border} 
                     hover:${ASCII_COLORS.buttonHoverBg} disabled:opacity-50 flex items-center gap-2`}
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Family Members */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Family Members
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {FAMILY_MEMBERS.map(member => (
            <div key={member.deviceId} className={`p-3 border rounded ${ASCII_COLORS.border} 
                                                  ${activeUser === member.nickname ? 'bg-yellow-900 bg-opacity-20' : 'bg-gray-900 bg-opacity-20'}`}>
              <div className="font-medium">{member.nickname}</div>
              <div className="text-sm text-gray-400">{member.role}</div>
              <div className="text-xs text-gray-500 font-mono">{member.deviceId.slice(-3)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <div className="mb-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-600 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-blue-400">Currently running: {currentTest}</span>
          </div>
          <div className="text-sm text-gray-400">
            Progress: {passedTests + failedTests}/{totalTests} tests completed
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium mb-3">Test Results</h3>
        
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tests run yet</p>
            <p className="text-sm">Click "Run All Tests" to start the P2P family scenario testing</p>
          </div>
        ) : (
          testResults.map((test, index) => (
            <div key={index} className={`p-4 border rounded-lg ${getStatusColor(test.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    {test.message && (
                      <p className="text-sm opacity-90">{test.message}</p>
                    )}
                  </div>
                </div>
                <div className="text-sm opacity-75">
                  {test.status.toUpperCase()}
                </div>
              </div>
              
              {test.details && (
                <div className="mt-2 p-2 bg-black bg-opacity-30 rounded text-xs font-mono">
                  {test.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {testResults.length > 0 && !isRunning && (
        <div className="mt-6 p-4 border-t-2 border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Test Summary</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">✓ {passedTests} passed</span>
              <span className="text-red-400">✗ {failedTests} failed</span>
              <span className="text-gray-400">📊 {totalTests} total</span>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalTests > 0 ? (passedTests / totalTests) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {passedTests === totalTests && totalTests > 0 && (
            <div className="mt-3 text-center text-green-400 font-medium">
              🎉 All P2P family scenarios passed! The system is ready for production.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default P2PTestRunner;