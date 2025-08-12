// Simple test to run self-test through UI and check results
import puppeteer from 'puppeteer';

async function runUITest() {
  console.log('🌐 Opening browser to run self-test through UI...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    console.log('✅ App loaded');
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find and click self-test button
    console.log('🔍 Looking for self-test button...');
    const selfTestButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const title = btn.getAttribute('title')?.toLowerCase() || '';
        const text = btn.textContent?.toLowerCase() || '';
        return title.includes('self-test') || title.includes('test') || text.includes('test');
      }) !== undefined;
    });
    
    if (selfTestButton) {
      console.log('✅ Self-test button found, clicking...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(btn => {
          const title = btn.getAttribute('title')?.toLowerCase() || '';
          return title.includes('self-test') || title.includes('test');
        });
        if (btn) btn.click();
      });
      
      // Wait for modal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if modal opened
      const modalOpened = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('Self-Test') || text.includes('INVENTORY OS SELF-TEST');
      });
      
      if (modalOpened) {
        console.log('✅ Self-test modal opened');
        
        // Click run test button
        console.log('▶️ Starting tests...');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const runBtn = buttons.find(btn => {
            const text = btn.textContent || '';
            return text.includes('Run Full Test Suite') || text.includes('Run') || text.includes('Start');
          });
          if (runBtn) runBtn.click();
        });
        
        // Wait for tests to complete (longer timeout)
        console.log('⏳ Waiting for tests to complete...');
        let testCompleted = false;
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds
        
        while (!testCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          
          const progress = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return {
              hasResults: text.includes('Test Summary') || text.includes('Total Tests') || text.includes('tests completed'),
              hasProgress: text.includes('Running') || text.includes('Progress'),
              testText: text.substring(0, 2000)
            };
          });
          
          if (progress.hasResults) {
            testCompleted = true;
            console.log('✅ Tests completed!');
          } else {
            console.log(`   ⏱️ Running... ${attempts}s`);
            if (progress.hasProgress) {
              console.log('   🔄 Progress detected');
            }
          }
        }
        
        if (testCompleted) {
          // Extract results
          const results = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return {
              fullText: text,
              hasWarehouseData: text.includes('warehouse') || text.includes('склад'),
              hasTestResults: text.includes('PASS') || text.includes('FAIL'),
              testSummary: text.match(/Total.*Tests.*:.*\d+/gi) || []
            };
          });
          
          console.log('\n📊 TEST RESULTS SUMMARY:');
          console.log(`   Has warehouse data: ${results.hasWarehouseData}`);
          console.log(`   Has test results: ${results.hasTestResults}`);
          console.log(`   Summary lines: ${results.testSummary.join(', ')}`);
          
          // Check current warehouses in UI
          const warehouseCount = await page.evaluate(() => {
            const warehouseElements = document.querySelectorAll('ul li');
            return Array.from(warehouseElements).filter(el => 
              el.textContent && el.textContent.trim().length > 0
            ).length;
          });
          
          console.log(`   Warehouses visible in UI: ${warehouseCount}`);
          
        } else {
          console.log('❌ Tests did not complete within timeout');
        }
        
      } else {
        console.log('❌ Self-test modal did not open');
      }
      
    } else {
      console.log('❌ Self-test button not found');
    }
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser will stay open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

runUITest();