const { chromium } = require('playwright');

module.exports = {
  config: {
    target: 'https://m.oddgrocer.com',
    engines: {
      playwright: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        },
        contextOptions: {
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15A372 Safari/604.1',
          isMobile: true,
          hasTouch: true,
          permissions: ['geolocation']
        }
      }
    },
    phases: [
      {
        duration: 300,
        arrivalRate: 2,
        name: '전체 사용자 여정 시뮬레이션'
      }
    ],
    processor: './user-journey.js'
  },
  scenarios: [
    {
      name: '완전한 쇼핑 사용자 여정',
      engine: 'playwright',
      testFunction: 'completeShoppingJourney',
      weight: 80
    },
    {
      name: '빠른 탐색 사용자',
      engine: 'playwright', 
      testFunction: 'quickBrowsingJourney',
      weight: 20
    }
  ]
};

// 완전한 쇼핑 여정 (메인 → 매장 → 상품 → 장바구니)
async function completeShoppingJourney(page, vuContext, events) {
  const startTime = Date.now();
  
  try {
    console.log('🛒 완전한 쇼핑 여정 시작...');
    
    // 1단계: 메인페이지 방문
    await page.goto('https://m.oddgrocer.com/main?id=2', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    events.emit('counter', 'journey.main_page_visited', 1);
    await simulateUserReading(page, 3000);
    
    // 2단계: 매장 탐색
    await navigateToStore(page, events);
    await simulateUserReading(page, 4000);
    
    // 3단계: 상품 탐색
    await browseProducts(page, events);
    
    // 4단계: 상품 상세 보기
    await viewProductDetails(page, events);
    
    // 5단계: 장바구니 상호작용 시뮬레이션
    await simulateCartInteraction(page, events);
    
    const totalTime = Date.now() - startTime;
    events.emit('counter', 'journey.complete_shopping_time', totalTime);
    events.emit('counter', 'journey.complete_shopping_success', 1);
    
    console.log(`✅ 완전한 쇼핑 여정 완료 (${totalTime}ms)`);
    
  } catch (error) {
    console.error('❌ 완전한 쇼핑 여정 실패:', error.message);
    events.emit('counter', 'journey.complete_shopping_failed', 1);
  }
}

// 빠른 탐색 사용자 (메인 → 매장 → 빠른 종료)
async function quickBrowsingJourney(page, vuContext, events) {
  const startTime = Date.now();
  
  try {
    console.log('⚡ 빠른 탐색 여정 시작...');
    
    // 1단계: 메인페이지 빠른 방문
    await page.goto('https://m.oddgrocer.com/main?id=2', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    events.emit('counter', 'journey.quick_main_visited', 1);
    await simulateUserReading(page, 1500);
    
    // 2단계: 빠른 매장 방문
    await navigateToStore(page, events);
    await simulateUserReading(page, 2000);
    
    // 3단계: 빠른 스크롤 및 종료
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    await page.waitForTimeout(1000);
    
    const totalTime = Date.now() - startTime;
    events.emit('counter', 'journey.quick_browsing_time', totalTime);
    events.emit('counter', 'journey.quick_browsing_success', 1);
    
    console.log(`⚡ 빠른 탐색 여정 완료 (${totalTime}ms)`);
    
  } catch (error) {
    console.error('❌ 빠른 탐색 여정 실패:', error.message);
    events.emit('counter', 'journey.quick_browsing_failed', 1);
  }
}

// 유틸리티 함수들
async function navigateToStore(page, events) {
  try {
    // 여러 방법으로 매장 이동 시도
    const storeSelectors = [
      'a[href*="/store/175"]',
      'a[href*="/store"]',
      '[data-testid="store-link"]',
      '.store-item a',
      '.store-card'
    ];
    
    for (const selector of storeSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 3000 });
        if (element) {
          await element.click();
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
          events.emit('counter', 'journey.store_navigation_success', 1);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: 직접 이동
    await page.goto('https://m.oddgrocer.com/store/175', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    events.emit('counter', 'journey.store_direct_navigation', 1);
    
  } catch (error) {
    console.log('⚠️ 매장 이동 실패:', error.message);
    events.emit('counter', 'journey.store_navigation_failed', 1);
  }
}

async function browseProducts(page, events) {
  try {
    // 상품 목록 스크롤
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    
    await page.waitForTimeout(2000);
    
    // 상품 요소 찾기
    const productSelectors = [
      '.product-item',
      '.product-card', 
      '[data-testid*="product"]',
      '.item-card',
      'article'
    ];
    
    for (const selector of productSelectors) {
      try {
        const products = await page.$$(selector);
        if (products.length > 0) {
          events.emit('counter', 'journey.products_found', products.length);
          return products;
        }
      } catch (e) {
        continue;
      }
    }
    
    events.emit('counter', 'journey.products_browsed', 1);
    
  } catch (error) {
    console.log('⚠️ 상품 탐색 실패:', error.message);
    events.emit('counter', 'journey.product_browse_failed', 1);
  }
}

async function viewProductDetails(page, events) {
  try {
    // 상품 클릭 시뮬레이션
    const productSelectors = [
      '.product-item:first-child',
      '.product-card:first-child',
      'article:first-child'
    ];
    
    for (const selector of productSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await page.waitForTimeout(3000);
          events.emit('counter', 'journey.product_detail_viewed', 1);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
  } catch (error) {
    console.log('⚠️ 상품 상세 보기 실패:', error.message);
    events.emit('counter', 'journey.product_detail_failed', 1);
  }
}

async function simulateCartInteraction(page, events) {
  try {
    // 장바구니 버튼 찾기 및 클릭 시뮬레이션
    const cartSelectors = [
      '[data-testid="add-to-cart"]',
      '.add-to-cart',
      '.cart-btn',
      'button[class*="cart"]'
    ];
    
    for (const selector of cartSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await page.waitForTimeout(1000);
          events.emit('counter', 'journey.cart_interaction', 1);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
  } catch (error) {
    console.log('⚠️ 장바구니 상호작용 실패:', error.message);
    events.emit('counter', 'journey.cart_interaction_failed', 1);
  }
}

async function simulateUserReading(page, duration) {
  // 사용자 읽기 시간 시뮬레이션
  await page.waitForTimeout(duration);
  
  // 랜덤한 스크롤 동작
  if (Math.random() > 0.5) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * window.innerHeight / 3);
    });
  }
}

module.exports.completeShoppingJourney = completeShoppingJourney;
module.exports.quickBrowsingJourney = quickBrowsingJourney;