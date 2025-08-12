// Простой тест Inventory OS
import puppeteer from 'puppeteer';

async function simpleTest() {
  console.log('🚀 Простой тест Inventory OS...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Обработчик ошибок консоли
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Загружаем приложение
    console.log('📱 Загрузка приложения...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Проверяем заголовок
    console.log('📋 Проверка основных элементов...');
    const title = await page.title();
    console.log(`   Заголовок страницы: ${title}`);
    
    // Проверяем наличие h1
    const h1Exists = await page.$('h1') !== null;
    console.log(`   ✅ H1 заголовок: ${h1Exists ? 'Найден' : 'Отсутствует'}`);
    
    if (h1Exists) {
      const h1Text = await page.$eval('h1', el => el.textContent);
      console.log(`   📦 Текст заголовка: "${h1Text}"`);
    }
    
    // Проверяем наличие основных панелей по тексту
    const pageText = await page.evaluate(() => document.body.textContent);
    
    console.log('🏗️ Проверка панелей:');
    console.log(`   WAREHOUSES: ${pageText.includes('WAREHOUSES') ? '✅' : '❌'}`);
    console.log(`   ROOMS: ${pageText.includes('ROOMS') ? '✅' : '❌'}`);
    console.log(`   CONTAINERS: ${pageText.includes('CONTAINERS') ? '✅' : '❌'}`);
    
    // Проверяем design mode
    const bodyClasses = await page.evaluate(() => document.body.className);
    console.log(`🎨 CSS классы body: ${bodyClasses}`);
    
    const designerModeActive = bodyClasses.includes('designer-mode');
    console.log(`   Designer Mode: ${designerModeActive ? '❌ ВКЛЮЧЕН (БАГ!)' : '✅ Отключен'}`);
    
    // Проверяем кнопки
    const buttonCount = await page.$$eval('button', buttons => buttons.length);
    console.log(`🔘 Количество кнопок: ${buttonCount}`);
    
    // Проверяем наличие SMARTIE кнопки
    const smartieExists = pageText.includes('SMARTIE') || pageText.includes('AI') || pageText.includes('🧠');
    console.log(`🧠 SMARTIE кнопка: ${smartieExists ? '✅' : '❌'}`);
    
    // Проверяем self-test кнопку
    const selfTestExists = await page.$('button[title*="Self-Test"]') !== null;
    console.log(`🧪 Self-Test кнопка: ${selfTestExists ? '✅' : '❌'}`);
    
    // Проверяем модальные окна (не должны быть открыты)
    const modals = await page.$$('div[class*="fixed inset-0"]:not([style*="display: none"])');
    console.log(`📱 Открытые модалы: ${modals.length === 0 ? '✅ Нет' : `❌ ${modals.length} открыто`}`);
    
    // Проверяем ошибки в консоли
    console.log(`🐛 Ошибки консоли: ${consoleErrors.length === 0 ? '✅ Нет' : `❌ ${consoleErrors.length} найдено`}`);
    if (consoleErrors.length > 0) {
      console.log('   Ошибки:');
      consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Быстрый тест создания склада
    console.log('🏭 Тест создания склада...');
    try {
      // Ищем кнопку + рядом с WAREHOUSES
      const warehouseSection = await page.evaluateHandle(() => {
        const headers = Array.from(document.querySelectorAll('h2'));
        return headers.find(h => h.textContent?.includes('WAREHOUSES'));
      });
      
      if (warehouseSection) {
        console.log('   ✅ Секция WAREHOUSES найдена');
        
        // Ищем кнопку + в той же области
        const plusButton = await page.$('button svg[data-lucide="plus"]');
        if (plusButton) {
          console.log('   ✅ Кнопка + найдена');
          await plusButton.click();
          
          // Ждем появления модала
          await page.waitForTimeout(500);
          
          const modalAppeared = await page.$('div[class*="fixed inset-0"]') !== null;
          console.log(`   📱 Модал создания: ${modalAppeared ? '✅ Появился' : '❌ Не появился'}`);
          
          if (modalAppeared) {
            // Закрываем модал
            const closeBtn = await page.$('button:has-text("Cancel"), button[class*="×"]');
            if (closeBtn) {
              await closeBtn.click();
              console.log('   ✅ Модал закрыт');
            }
          }
        } else {
          console.log('   ❌ Кнопка + не найдена');
        }
      } else {
        console.log('   ❌ Секция WAREHOUSES не найдена');
      }
    } catch (error) {
      console.log(`   ❌ Ошибка теста: ${error.message}`);
    }
    
    console.log('✅ Простой тест завершен!');
    
    // Итоговый отчет
    const issues = [];
    if (designerModeActive) issues.push('Designer Mode включен по умолчанию');
    if (consoleErrors.length > 0) issues.push(`${consoleErrors.length} ошибок в консоли`);
    if (!pageText.includes('WAREHOUSES')) issues.push('Отсутствует панель WAREHOUSES');
    if (!smartieExists) issues.push('Отсутствует SMARTIE');
    if (!selfTestExists) issues.push('Отсутствует Self-Test');
    
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
    if (issues.length === 0) {
      console.log('🎉 Проблем не найдено! Приложение готово к деплою.');
    } else {
      console.log(`❌ Найдено ${issues.length} проблем:`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Тест провалился:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

simpleTest();