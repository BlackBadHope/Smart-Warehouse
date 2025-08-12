// Quick diagnostic test for Inventory OS
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function quickTest() {
  console.log('⚡ QUICK DIAGNOSTIC TEST');
  console.log('=' .repeat(40));
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Show browser to see what's happening
      args: ['--no-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    console.log('🌐 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'DebugLog/app-screenshot.png' });
    
    // Get page content info
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      h1Text: document.querySelector('h1')?.textContent || 'No H1 found',
      buttonCount: document.querySelectorAll('button').length,
      buttonTexts: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim() || '').filter(t => t.length > 0),
      hasTestTube: document.querySelector('svg[data-lucide="test-tube"]') !== null,
      hasSelfTest: document.body.textContent?.includes('Self-Test') || false,
      bodyTextSample: document.body.textContent?.substring(0, 1000) || ''
    }));
    
    console.log('\n📊 PAGE ANALYSIS:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   H1: ${pageInfo.h1Text}`);
    console.log(`   Buttons found: ${pageInfo.buttonCount}`);
    console.log(`   Has TestTube icon: ${pageInfo.hasTestTube}`);
    console.log(`   Contains "Self-Test": ${pageInfo.hasSelfTest}`);
    
    console.log('\n🔘 AVAILABLE BUTTONS:');
    pageInfo.buttonTexts.forEach((text, i) => {
      if (text.length > 0) {
        console.log(`   ${i + 1}. "${text}"`);
      }
    });
    
    // Try to click any button that might open self-test
    console.log('\n🧪 Looking for test-related buttons...');
    const testButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Look for buttons with test-related content
      const testButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const title = btn.getAttribute('title')?.toLowerCase() || '';
        return text.includes('test') || title.includes('test') || title.includes('self-test');
      });
      
      if (testButton) {
        testButton.click();
        return true;
      }
      return false;
    });
    
    if (testButtonClicked) {
      console.log('✅ Test button clicked!');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if modal appeared
      const modalInfo = await page.evaluate(() => {
        const modals = document.querySelectorAll('div[class*="fixed"], div[class*="modal"]');
        return {
          modalCount: modals.length,
          hasModal: modals.length > 0,
          modalText: Array.from(modals).map(m => m.textContent?.substring(0, 200) || '').join(' | ')
        };
      });
      
      console.log(`   Modal appeared: ${modalInfo.hasModal}`);
      console.log(`   Modal count: ${modalInfo.modalCount}`);
      if (modalInfo.modalText) {
        console.log(`   Modal content: ${modalInfo.modalText.substring(0, 300)}...`);
      }
    } else {
      console.log('❌ No test button found');
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173',
      pageInfo,
      testButtonFound: testButtonClicked,
      screenshot: 'app-screenshot.png'
    };
    
    const debugDir = 'DebugLog';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(`${debugDir}/quick-test-${Date.now()}.json`, JSON.stringify(report, null, 2));
    
    console.log('\n✅ Quick test completed! Check DebugLog/ for screenshot and details.');
    
    // Keep browser open for 5 seconds to see result
    console.log('🔍 Browser will stay open for 5 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

quickTest();