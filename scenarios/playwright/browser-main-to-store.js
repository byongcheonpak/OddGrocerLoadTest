const { chromium } = require('playwright');

module.exports = {
  config: {
    target: 'https://m.oddgrocer.com',
    engines: {
      playwright: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        contextOptions: {
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          isMobile: true,
          hasTouch: true
        }
      }
    },
    phases: [
      {
        duration: 120,
        arrivalRate: 3,
        name: '브라우저 기반 메인→매장 이동 테스트'
      }
    ],
    processor: './browser-main-to-store.js'
  },
  scenarios: [
    {
      name: '메인페이지에서 매장으로 이동하는 사용자 여정',
      engine: 'playwright',
      testFunction: 'mainToStoreJourney'
    }
  ]
};

async function mainToStoreJourney(page, vuContext, events) {
  const startTime = Date.now();
  
  try {
    // 1단계: 메인페이지 방문
    console.log('📱 메인페이지 로드 시작...');
    
    const mainPageResponse = await page.goto('https://m.oddgrocer.com/main?id=2', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // 페이지 로드 성능 측정
    const mainPageLoadTime = Date.now() - startTime;
    events.emit('counter', 'browser.main_page_load_time', mainPageLoadTime);
    events.emit('counter', 'browser.main_page_loaded', 1);
    
    if (!mainPageResponse.ok()) {
      throw new Error(`메인페이지 로드 실패: ${mainPageResponse.status()}`);
    }
    
    console.log(`✅ 메인페이지 로드 완료 (${mainPageLoadTime}ms)`);
    
    // 2단계: 페이지 요소 대기 및 상호작용
    await page.waitForTimeout(2000); // 사용자 읽기 시간 시뮬레이션
    
    // 매장 링크 또는 버튼 찾기 (여러 선택자 시도)
    const storeSelectors = [
      'a[href*="/store/175"]',
      'a[href*="/store"]',
      '[data-testid="store-link"]',
      '.store-item',
      '.store-card'
    ];
    
    let storeElement = null;
    for (const selector of storeSelectors) {
      try {
        storeElement = await page.waitForSelector(selector, { timeout: 5000 });
        if (storeElement) {
          console.log(`🔍 매장 요소 발견: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`⚠️ 선택자 ${selector} 찾기 실패, 다음 시도...`);
      }
    }
    
    // 3단계: 매장 페이지로 이동
    let navigationTime = 0;
    
    if (storeElement) {
      console.log('🖱️ 매장 링크 클릭...');
      const navigationStartTime = Date.now();
      
      // 매장 링크 클릭
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        storeElement.click()
      ]);
      
      navigationTime = Date.now() - navigationStartTime;
      events.emit('counter', 'browser.store_navigation_time', navigationTime);
      events.emit('counter', 'browser.store_navigation_success', 1);
      
      console.log(`✅ 매장 페이지 이동 완료 (${navigationTime}ms)`);
    } else {
      // 직접 URL로 이동 (fallback)
      console.log('🔄 직접 매장 URL로 이동...');
      const navigationStartTime = Date.now();
      
      await page.goto('https://m.oddgrocer.com/store/175', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      navigationTime = Date.now() - navigationStartTime;
      events.emit('counter', 'browser.store_direct_navigation_time', navigationTime);
      events.emit('counter', 'browser.store_direct_navigation', 1);
      
      console.log(`✅ 매장 페이지 직접 이동 완료 (${navigationTime}ms)`);
    }
    
    // 4단계: 매장 페이지 상호작용
    await page.waitForTimeout(3000); // 사용자 탐색 시간
    
    // 페이지 스크롤 시뮬레이션
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    
    await page.waitForTimeout(2000);
    
    // 추가 상호작용 (상품 클릭 등)
    try {
      const productElements = await page.$$('.product-item, .product-card, [data-testid*="product"]');
      if (productElements.length > 0) {
        await productElements[0].click();
        await page.waitForTimeout(1000);
        console.log('🛍️ 상품 클릭 완료');
        events.emit('counter', 'browser.product_interaction', 1);
      }
    } catch (e) {
      console.log('⚠️ 상품 상호작용 실패:', e.message);
    }
    
    // 전체 여정 시간 측정
    const totalJourneyTime = Date.now() - startTime;
    events.emit('counter', 'browser.total_journey_time', totalJourneyTime);
    events.emit('counter', 'browser.journey_completed', 1);
    
    console.log(`🎯 전체 사용자 여정 완료 (${totalJourneyTime}ms)`);
    
  } catch (error) {
    console.error('❌ 브라우저 테스트 실패:', error.message);
    events.emit('counter', 'browser.journey_failed', 1);
    throw error;
  }
}

module.exports.mainToStoreJourney = mainToStoreJourney;