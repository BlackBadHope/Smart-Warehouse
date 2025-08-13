import debugService from '../debugService';
import uiUpdateService from '../uiUpdateService';

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

export abstract class TestRunner {
  protected testResults: TestSuite[] = [];
  protected isRunning = false;

  abstract runTests(): Promise<TestSuite[]>;

  protected createTestSuite(suiteName: string): TestSuite {
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

  protected async runTest(
    suite: TestSuite, 
    testName: string, 
    testFunction: () => Promise<{ status: 'PASS' | 'FAIL' | 'SKIP'; message: string; details?: any }>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      debugService.info(`  ▶️ Running test: ${testName}`);
      
      // Emit test progress event
      uiUpdateService.emit('test-progress', {
        testName,
        suite: suite.suiteName,
        status: 'running'
      }, 'testRunner');
      
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
      
      // Update suite statistics
      switch (result.status) {
        case 'PASS':
          suite.passed++;
          debugService.info(`  ✅ ${testName}: ${result.message}`);
          break;
        case 'FAIL':
          suite.failed++;
          debugService.error(`  ❌ ${testName}: ${result.message}`);
          break;
        case 'SKIP':
          suite.skipped++;
          debugService.warn(`  ⚠️ ${testName}: ${result.message}`);
          break;
      }
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult: TestResult = {
        testName,
        status: 'FAIL',
        message: `Test error: ${(error as Error).message}`,
        details: { error: (error as Error).stack },
        timestamp: new Date(),
        duration
      };
      
      suite.results.push(testResult);
      suite.failed++;
      debugService.error(`  💥 ${testName} crashed:`, error);
    }
  }

  protected completeTestSuite(suite: TestSuite): void {
    suite.endTime = new Date();
    suite.totalDuration = suite.endTime.getTime() - suite.startTime.getTime();
    
    debugService.info(`📊 Suite '${suite.suiteName}' completed:`, {
      passed: suite.passed,
      failed: suite.failed,
      skipped: suite.skipped,
      duration: suite.totalDuration
    });
  }

  protected createDetailedSteps(baseSteps: Array<{
    step: number;
    action: string;
    status: string;
    details?: any;
  }>): Array<any> {
    return baseSteps.map(step => ({
      ...step,
      timestamp: Date.now(),
      status: 'completed'
    }));
  }

  getResults(): TestSuite[] {
    return [...this.testResults];
  }

  clearResults(): void {
    this.testResults = [];
  }

  isTestRunning(): boolean {
    return this.isRunning;
  }

  // Utility method for creating test steps with enhanced details
  protected createTestSteps(actions: string[], details: any[] = []): Array<any> {
    return actions.map((action, index) => ({
      step: index + 1,
      action,
      timestamp: Date.now(),
      status: 'completed',
      details: details[index] || {}
    }));
  }
}