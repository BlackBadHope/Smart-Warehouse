// Test script for new P2P and social features
import './services/localStorageService.js';
import './services/selfTestService.js';

console.log('🧪 Testing new P2P and social features...');

// Test if we can run the new self-test suites
async function testNewFeatures() {
  try {
    // Import the services
    const { default: selfTestService } = await import('./services/selfTestService.js');
    
    console.log('📋 Starting comprehensive self-test suite...');
    
    // Run the complete test suite (including new P2P and social tests)
    const results = await selfTestService.runAllTests();
    
    console.log('✅ Test suite completed!');
    console.log(`📊 Results: ${results.length} test suites executed`);
    
    // Export results
    const exportedResults = selfTestService.exportTestResults();
    console.log('📄 Test results exported:', exportedResults.substring(0, 200) + '...');
    
    // Save results
    selfTestService.saveTestResults();
    console.log('💾 Test results saved to DebugLog');
    
    return results;
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return null;
  }
}

// Run tests when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    testNewFeatures();
  });
} else {
  // Node.js environment
  testNewFeatures();
}