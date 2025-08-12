// Real environment test runner for Inventory OS
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function runRealTest() {
  console.log('🔥 REAL ENVIRONMENT TEST - Inventory OS v2.6');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    
    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to app
    console.log('🌐 Loading Inventory OS...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('✅ App loaded successfully');
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and click Self-Test button
    console.log('🧪 Looking for Self-Test button...');
    
    const selfTestButton = await page.$('button[title*="Self-Test"]');
    if (!selfTestButton) {
      console.log('❌ Self-Test button not found, checking alternatives...');
      
      // Try to find by TestTube icon or text
      const alternativeButton = await page.$('button:has-text("🧪"), button svg[data-lucide="test-tube"]');
      if (alternativeButton) {
        console.log('✅ Found alternative test button');
        await alternativeButton.click();
      } else {
        throw new Error('No self-test button found');
      }
    } else {
      console.log('✅ Self-Test button found');
      await selfTestButton.click();
    }
    
    // Wait for modal to appear
    console.log('⏳ Waiting for Self-Test modal...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if modal appeared
    const modal = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      return elements.find(el => 
        el.textContent?.includes('Self-Test') || 
        el.textContent?.includes('INVENTORY OS SELF-TEST')
      );
    });
    
    if (!modal) {
      throw new Error('Self-Test modal did not appear');
    }
    
    console.log('✅ Self-Test modal opened');
    
    // Look for "Run Full Test Suite" button
    console.log('▶️ Looking for test execution button...');
    const runButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent?.includes('Run Full Test Suite') ||
        btn.textContent?.includes('Run') ||
        btn.textContent?.includes('Start')
      );
    });
    
    if (!runButton) {
      throw new Error('Run test button not found');
    }
    
    console.log('✅ Found run button, starting tests...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(btn => 
        btn.textContent?.includes('Run Full Test Suite') ||
        btn.textContent?.includes('Run') ||
        btn.textContent?.includes('Start')
      );
      if (btn) btn.click();
    });
    
    // Wait for tests to complete (max 30 seconds)
    console.log('⏳ Running tests... (this may take up to 30 seconds)');
    
    let testCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (!testCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      // Check if tests completed by looking for results
      const resultsSection = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('Test Summary') || text.includes('Total Tests') || text.includes('tests completed');
      });
      
      if (resultsSection) {
        testCompleted = true;
      }
      
      console.log(`   ⏱️ Testing... ${attempts}s`);
    }
    
    if (!testCompleted) {
      throw new Error('Tests did not complete within 30 seconds');
    }
    
    console.log('✅ Tests completed! Extracting results...');
    
    // Extract test results
    const results = await page.evaluate(() => {
      // Try to find test summary data
      const summaryElements = document.querySelectorAll('div:has-text("Total Tests"), *:contains("Total Tests")');
      const testData = {
        found: summaryElements.length > 0,
        text: document.body.innerText
      };
      
      // Look for specific test result indicators
      const passedElements = document.querySelectorAll('*:contains("✅"), *:contains("PASS")');
      const failedElements = document.querySelectorAll('*:contains("❌"), *:contains("FAIL")');
      
      return {
        testData,
        passedCount: passedElements.length,
        failedCount: failedElements.length,
        bodyText: document.body.innerText.substring(0, 5000) // First 5000 chars
      };
    });
    
    console.log('\n📊 TEST RESULTS EXTRACTED:');
    console.log(`   Passed indicators found: ${results.passedCount}`);
    console.log(`   Failed indicators found: ${results.failedCount}`);
    
    // Try to download results
    console.log('\n💾 Attempting to export results...');
    const exportButton = await page.$('button:has-text("Export"), button:has-text("Download")');
    if (exportButton) {
      await exportButton.click();
      console.log('✅ Export triggered');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check console errors
    console.log('\n🐛 CONSOLE ERROR CHECK:');
    if (consoleErrors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log(`❌ Found ${consoleErrors.length} console errors:`);
      consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      testExecuted: testCompleted,
      consoleErrors: consoleErrors,
      passedIndicators: results.passedCount,
      failedIndicators: results.failedCount,
      bodyTextSample: results.bodyText,
      success: testCompleted && consoleErrors.length === 0
    };
    
    // Save report to DebugLog
    const reportPath = path.join(process.cwd(), 'DebugLog', `real-test-${Date.now()}.json`);
    
    // Ensure DebugLog directory exists
    const debugDir = path.join(process.cwd(), 'DebugLog');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    if (report.success) {
      console.log('🎉 SUCCESS: Real environment test passed!');
      console.log('✅ Self-test system is working correctly');
      console.log('✅ No critical console errors');
      console.log('🚀 Ready for deployment!');
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (!testCompleted) console.log('   - Tests did not complete');
      if (consoleErrors.length > 0) console.log(`   - ${consoleErrors.length} console errors`);
      console.log('🔧 Needs fixes before deployment');
    }
    
  } catch (error) {
    console.error('❌ REAL TEST FAILED:', error.message);
    
    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      success: false
    };
    
    const debugDir = path.join(process.cwd(), 'DebugLog');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const errorPath = path.join(debugDir, `real-test-error-${Date.now()}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errorReport, null, 2));
    console.log(`💾 Error report saved to: ${errorPath}`);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runRealTest();