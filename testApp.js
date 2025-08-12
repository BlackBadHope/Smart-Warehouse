// Simple browser automation test for Inventory OS
import puppeteer from 'puppeteer';

async function testApp() {
  console.log('🚀 Starting Inventory OS Browser Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // показать браузер
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Загружаем приложение
    console.log('📱 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Проверяем заголовок
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`✅ App title: ${title}`);
    
    // Проверяем наличие основных элементов по заголовкам
    const warehousesHeader = await page.$('h2:has-text("WAREHOUSES")') || await page.$eval('h2', el => el.textContent?.includes('WAREHOUSES') ? el : null).catch(() => null);
    const roomsHeader = await page.$('h2:has-text("ROOMS")') || await page.$eval('h2', el => el.textContent?.includes('ROOMS') ? el : null).catch(() => null);
    const containersHeader = await page.$('h2:has-text("CONTAINERS")') || await page.$eval('h2', el => el.textContent?.includes('CONTAINERS') ? el : null).catch(() => null);
    
    console.log(`✅ Warehouses panel: ${warehousesHeader ? 'Present' : 'Missing'}`);
    console.log(`✅ Rooms panel: ${roomsHeader ? 'Present' : 'Missing'}`);  
    console.log(`✅ Containers panel: ${containersHeader ? 'Present' : 'Missing'}`);
    
    // Проверяем баг с design mode
    const bodyClasses = await page.evaluate(() => document.body.className);
    console.log(`🎨 Body classes: ${bodyClasses}`);
    
    if (bodyClasses.includes('designer-mode')) {
      console.log('❌ BUG FOUND: Designer mode is enabled by default!');
    } else {
      console.log('✅ Designer mode is correctly disabled');
    }
    
    // Тест создания склада - ищем кнопку Plus
    console.log('🏗️ Testing warehouse creation...');
    const createWarehouseBtn = await page.$('button svg[data-testid="plus"], button:has([data-lucide="plus"])').catch(() => null);
    if (createWarehouseBtn) {
      await createWarehouseBtn.click();
      console.log('✅ Warehouse creation button clicked');
    } else {
      console.log('⚠️ Warehouse creation button not found');
    }
    
    // Проверяем модальные окна
    console.log('🔍 Checking for modals...');
    await page.waitForTimeout(1000);
    
    const modal = await page.$('div[class*="modal"], div[class*="fixed inset-0"]');
    if (modal) {
      console.log('✅ Modal appeared');
      
      // Закрываем модал
      const closeBtn = await page.$('button:has-text("Cancel"), button:has-text("×")');
      if (closeBtn) {
        await closeBtn.click();
        console.log('✅ Modal closed');
      }
    }
    
    // Тест SMARTIE кнопки
    console.log('🧠 Testing SMARTIE button...');
    const smartieBtn = await page.$('button[title*="SMARTIE"], button[title*="AI"]');
    if (smartieBtn) {
      console.log('✅ SMARTIE button found');
    } else {
      console.log('❌ SMARTIE button not found');
    }
    
    // Тест self-test кнопки
    console.log('🧪 Testing Self-Test button...');
    const selfTestBtn = await page.$('button[title*="Self-Test"]');
    if (selfTestBtn) {
      console.log('✅ Self-Test button found');
      
      // Кликаем на self-test
      await selfTestBtn.click();
      await page.waitForTimeout(2000);
      
      const testModal = await page.$('text="Self-Test Suite"');
      if (testModal) {
        console.log('✅ Self-Test modal opened');
        
        // Закрываем
        const closeTestBtn = await page.$('button:has-text("×")');
        if (closeTestBtn) {
          await closeTestBtn.click();
        }
      }
    } else {
      console.log('❌ Self-Test button not found');
    }
    
    // Проверяем консольные ошибки
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('❌ Console errors found:');
      errors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ No console errors');
    }
    
    console.log('🎉 Browser test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Запускаем тест
testApp().catch(console.error);