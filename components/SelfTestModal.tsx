import React, { useState, useEffect } from 'react';
import { X, Play, Download, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import selfTestService, { TestSuite, TestResult } from '../services/selfTestService';
import debugService from '../services/debugService';
import * as localStorageService from '../services/localStorageService';

interface SelfTestModalProps {
  show: boolean;
  onClose: () => void;
}

const SelfTestModal: React.FC<SelfTestModalProps> = ({ show, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [savedResults, setSavedResults] = useState<Array<{ key: string; timestamp: string; data: any }>>([]);

  useEffect(() => {
    if (show) {
      loadSavedResults();
    }
  }, [show]);

  const loadSavedResults = () => {
    const saved = selfTestService.getSavedTestResults();
    setSavedResults(saved);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('Initializing tests...');
    setProgress(0);
    setShowResults(false);

    try {
      debugService.info('🧪 Starting self-test from UI');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 95));
      }, 500);

      const results = await selfTestService.runFullTestSuite();
      
      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);
      setShowResults(true);
      
      // Auto-save results
      selfTestService.saveTestResults();
      loadSavedResults();
      
      debugService.info('✅ Self-test completed from UI', {
        totalSuites: results.length,
        totalTests: results.reduce((sum, suite) => sum + suite.results.length, 0)
      });

    } catch (error) {
      debugService.error('❌ Self-test failed from UI', { error: (error as Error).message });
      setCurrentTest(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const exportResults = () => {
    const exportData = selfTestService.exportTestResults();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-os-self-test-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugService.info('📁 Test results exported');
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL' | 'SKIP') => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAIL': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'SKIP': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSuiteStatusColor = (suite: TestSuite) => {
    if (suite.failed > 0) return 'text-red-400';
    if (suite.skipped > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const loadPreviousResult = (resultData: any) => {
    setTestResults(resultData.testSuites || []);
    setShowResults(true);
  };

  const resetData = () => {
    if (confirm('⚠️ This will permanently delete ALL warehouses, rooms, containers, and items. Are you sure?')) {
      try {
        localStorageService.resetAllData();
        debugService.info('🗑️ All data reset by user');
        alert('✅ All data has been reset successfully.');
        // Clear test results too since they're now irrelevant
        setTestResults([]);
        setShowResults(false);
      } catch (error) {
        debugService.error('❌ Failed to reset data', error);
        alert('❌ Failed to reset data. Check console for details.');
      }
    }
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} border-2 ${ASCII_COLORS.border} rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`${ASCII_COLORS.inputBg} p-4 border-b ${ASCII_COLORS.border} flex items-center justify-between`}>
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
            🧪 INVENTORY OS SELF-TEST SUITE
          </h2>
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Controls */}
          <div className={`w-1/3 ${ASCII_COLORS.inputBg} border-r ${ASCII_COLORS.border} p-4 overflow-y-auto`}>
            <div className="space-y-4">
              {/* Test Controls */}
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Test Controls</h3>
                
                <button
                  onClick={runTests}
                  disabled={isRunning}
                  className={`w-full ${ASCII_COLORS.buttonBg} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center justify-center`}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
                </button>

                <button
                  onClick={resetData}
                  disabled={isRunning}
                  className={`w-full mt-2 bg-red-600 hover:bg-red-700 p-2 rounded-md border border-red-500 disabled:opacity-50 flex items-center justify-center text-white`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </button>

                {isRunning && (
                  <div className="mt-3">
                    <div className={`${ASCII_COLORS.text} text-sm mb-1`}>
                      {currentTest || 'Running tests...'}
                    </div>
                    <div className={`w-full bg-gray-700 rounded-full h-2`}>
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className={`${ASCII_COLORS.text} text-xs mt-1`}>
                      {progress.toFixed(0)}% complete
                    </div>
                  </div>
                )}

                {showResults && (
                  <button
                    onClick={exportResults}
                    className={`w-full mt-2 ${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center justify-center`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </button>
                )}
              </div>

              {/* Test Configuration */}
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Test Configuration</h3>
                <div className={`${ASCII_COLORS.text} text-sm space-y-2`}>
                  <div>✅ Core Functionality Tests</div>
                  <div>✅ UI/UX Component Tests</div>
                  <div>✅ Data Persistence Tests</div>
                  <div>✅ SMARTIE AI Tests (Local LLM)</div>
                  <div>✅ Localization Tests</div>
                  <div>✅ Theme System Tests</div>
                  <div>✅ Import/Export Tests</div>
                  <div>✅ Performance Tests</div>
                </div>
              </div>

              {/* SMARTIE Configuration */}
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>SMARTIE Configuration</h3>
                <div className={`${ASCII_COLORS.text} text-sm space-y-1`}>
                  <div><strong>Local LLM URL:</strong></div>
                  <div className="text-green-400">http://172.29.240.1:5174</div>
                  <div><strong>Model:</strong></div>
                  <div className="text-green-400">openai/gpt-oss-20b</div>
                  <div><strong>Status:</strong></div>
                  <div className="text-green-400">✅ Configured for testing</div>
                </div>
              </div>

              {/* Previous Results */}
              {savedResults.length > 0 && (
                <div>
                  <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Previous Results</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedResults.slice(0, 5).map((result, index) => (
                      <button
                        key={result.key}
                        onClick={() => loadPreviousResult(result.data)}
                        className={`w-full text-left ${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
                      >
                        <div className={`${ASCII_COLORS.text} text-xs`}>
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                        <div className={`${ASCII_COLORS.text} text-xs opacity-70`}>
                          {result.data.summary?.totalTests || 0} tests
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="w-2/3 p-4 overflow-y-auto">
            {showResults && testResults.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`${ASCII_COLORS.inputBg} p-4 rounded-lg border ${ASCII_COLORS.border}`}>
                  <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Test Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={`${ASCII_COLORS.text} text-2xl font-bold`}>
                        {testResults.reduce((sum, suite) => sum + suite.results.length, 0)}
                      </div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70`}>Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 text-2xl font-bold">
                        {testResults.reduce((sum, suite) => sum + suite.passed, 0)}
                      </div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70`}>Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 text-2xl font-bold">
                        {testResults.reduce((sum, suite) => sum + suite.failed, 0)}
                      </div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70`}>Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 text-2xl font-bold">
                        {testResults.reduce((sum, suite) => sum + suite.skipped, 0)}
                      </div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70`}>Skipped</div>
                    </div>
                  </div>
                </div>

                {/* Test Suites */}
                {testResults.map((suite, suiteIndex) => (
                  <div key={suiteIndex} className={`${ASCII_COLORS.inputBg} rounded-lg border ${ASCII_COLORS.border} overflow-hidden`}>
                    <div className="p-4 border-b border-gray-600">
                      <div className="flex items-center justify-between">
                        <h4 className={`${getSuiteStatusColor(suite)} text-lg font-bold`}>
                          {suite.suiteName}
                        </h4>
                        <div className={`${ASCII_COLORS.text} text-sm opacity-70`}>
                          {suite.totalDuration}ms
                        </div>
                      </div>
                      <div className={`${ASCII_COLORS.text} text-sm mt-1`}>
                        {suite.passed} passed, {suite.failed} failed, {suite.skipped} skipped
                      </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      {suite.results.map((test, testIndex) => (
                        <div key={testIndex} className={`p-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-800`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {getStatusIcon(test.status)}
                              <span className={`${ASCII_COLORS.text} ml-2 text-sm`}>
                                {test.testName}
                              </span>
                            </div>
                            <div className={`${ASCII_COLORS.text} text-xs opacity-70`}>
                              {test.duration.toFixed(2)}ms
                            </div>
                          </div>
                          <div className={`${ASCII_COLORS.text} text-xs mt-1 opacity-70`}>
                            {test.message}
                          </div>
                          {test.details && (
                            <details className="mt-2">
                              <summary className={`${ASCII_COLORS.text} text-xs cursor-pointer opacity-50 hover:opacity-70`}>
                                View Details
                              </summary>
                              <pre className={`${ASCII_COLORS.text} text-xs mt-1 bg-black p-2 rounded overflow-x-auto`}>
                                {JSON.stringify(test.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {isRunning ? (
                    <>
                      <Clock className={`w-16 h-16 ${ASCII_COLORS.accent} mx-auto mb-4 animate-spin`} />
                      <div className={`${ASCII_COLORS.text} text-lg`}>Running Tests...</div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70 mt-2`}>
                        {currentTest}
                      </div>
                    </>
                  ) : (
                    <>
                      <Play className={`w-16 h-16 ${ASCII_COLORS.accent} mx-auto mb-4`} />
                      <div className={`${ASCII_COLORS.text} text-lg`}>Ready to Test</div>
                      <div className={`${ASCII_COLORS.text} text-sm opacity-70 mt-2`}>
                        Click "Run Full Test Suite" to begin comprehensive testing
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfTestModal;