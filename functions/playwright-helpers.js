const { chromium, webkit, firefox } = require('playwright');

// 브라우저 유틸리티 클래스
class BrowserTestHelper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      viewport: options.viewport || { width: 375, height: 667 },
      userAgent: options.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      timeout: options.timeout || 30000,
      ...options
    };
  }

  // 모바일 사용자 시뮬레이션
  async simulateMobileUser(page) {
    await page.setViewportSize(this.options.viewport);
    
    // 터치 이벤트 활성화
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: false,
        value: 5,
      });
    });
    
    // 네트워크 조건 시뮬레이션 (3G)
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      await route.continue();
    });
  }

  // 사용자 행동 시뮬레이션
  async simulateUserBehavior(page, actions = []) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'scroll':
            await this.simulateScroll(page, action.options);
            break;
          case 'click':
            await this.simulateClick(page, action.selector, action.options);
            break;
          case 'type':
            await this.simulateTyping(page, action.selector, action.text, action.options);
            break;
          case 'wait':
            await page.waitForTimeout(action.duration || 1000);
            break;
          case 'swipe':
            await this.simulateSwipe(page, action.direction);
            break;
        }
      } catch (error) {
        console.log(`Action ${action.type} failed:`, error.message);
      }
    }
  }

  // 스크롤 시뮬레이션
  async simulateScroll(page, options = {}) {
    const { direction = 'down', distance = 'viewport', speed = 'normal' } = options;
    
    const scrollDistance = distance === 'viewport' 
      ? await page.evaluate(() => window.innerHeight / 2)
      : distance;
    
    const scrollDelay = speed === 'fast' ? 50 : speed === 'slow' ? 200 : 100;
    
    await page.evaluate(({ distance, delay, direction }) => {
      const startY = window.scrollY;
      const targetY = direction === 'up' 
        ? Math.max(0, startY - distance)
        : startY + distance;
      
      let currentY = startY;
      const step = (targetY - startY) / 10;
      
      const scroll = () => {
        currentY += step;
        window.scrollTo(0, currentY);
        
        if (Math.abs(currentY - targetY) > Math.abs(step)) {
          setTimeout(scroll, delay);
        }
      };
      
      scroll();
    }, { distance: scrollDistance, delay: scrollDelay, direction });
    
    await page.waitForTimeout(scrollDelay * 10);
  }

  // 클릭 시뮬레이션 (터치 포함)
  async simulateClick(page, selector, options = {}) {
    const element = await page.waitForSelector(selector, { timeout: 5000 });
    
    if (element) {
      // 모바일에서는 터치 이벤트도 시뮬레이션
      await element.hover();
      await page.waitForTimeout(100);
      await element.click(options);
      await page.waitForTimeout(200);
    }
  }

  // 타이핑 시뮬레이션
  async simulateTyping(page, selector, text, options = {}) {
    const element = await page.waitForSelector(selector, { timeout: 5000 });
    
    if (element) {
      await element.click();
      await page.waitForTimeout(100);
      
      // 인간처럼 타이핑 (지연 포함)
      for (const char of text) {
        await element.type(char, { delay: Math.random() * 100 + 50 });
      }
    }
  }

  // 스와이프 시뮬레이션
  async simulateSwipe(page, direction = 'left') {
    const viewport = page.viewportSize();
    const startX = viewport.width / 2;
    const startY = viewport.height / 2;
    
    let endX = startX;
    let endY = startY;
    
    switch (direction) {
      case 'left':
        endX = startX - viewport.width / 3;
        break;
      case 'right':
        endX = startX + viewport.width / 3;
        break;
      case 'up':
        endY = startY - viewport.height / 3;
        break;
      case 'down':
        endY = startY + viewport.height / 3;
        break;
    }
    
    await page.touchscreen.tap(startX, startY);
    await page.touchscreen.tap(endX, endY);
  }

  // 페이지 성능 측정
  async measurePagePerformance(page, url) {
    const startTime = Date.now();
    
    // Navigation timing 수집
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize
      };
    });
    
    const totalTime = Date.now() - startTime;
    
    return {
      ...performanceData,
      totalLoadTime: totalTime,
      url
    };
  }

  // 네트워크 요청 모니터링
  async monitorNetworkRequests(page, callback) {
    const requests = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });
    
    page.on('response', response => {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        request.status = response.status();
        request.size = response.headers()['content-length'] || 0;
        request.duration = Date.now() - request.timestamp;
        
        if (callback) {
          callback(request, response);
        }
      }
    });
    
    return requests;
  }

  // 에러 캐처
  async setupErrorHandling(page, errorCallback) {
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
      if (errorCallback) errorCallback('pageerror', error);
    });
    
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure());
      if (errorCallback) errorCallback('requestfailed', request);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
        if (errorCallback) errorCallback('consoleerror', msg);
      }
    });
  }
}

// 일반적인 브라우저 테스트 시나리오
async function runBasicBrowserTest(url, options = {}) {
  const browser = await chromium.launch({ headless: options.headless !== false });
  const context = await browser.newContext({
    viewport: options.viewport || { width: 375, height: 667 },
    userAgent: options.userAgent
  });
  
  const page = await context.newPage();
  const helper = new BrowserTestHelper(options);
  
  try {
    await helper.setupErrorHandling(page);
    const requests = await helper.monitorNetworkRequests(page);
    
    const performance = await helper.measurePagePerformance(page, url);
    
    return {
      performance,
      requests: requests.length,
      success: true
    };
    
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  BrowserTestHelper,
  runBasicBrowserTest
};