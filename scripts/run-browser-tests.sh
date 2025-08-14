#!/bin/bash

# OddGrocer Playwright 브라우저 테스트 실행 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_browser() {
    echo -e "${PURPLE}[BROWSER]${NC} $1"
}

# 환경 변수 로드
if [ -f .env ]; then
    source .env
    log_info "환경 변수 로드 완료"
else
    log_warning ".env 파일을 찾을 수 없습니다. 기본값을 사용합니다."
fi

# 기본 설정
BASE_URL=${BASE_URL:-"https://m.oddgrocer.com"}
REPORT_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BROWSER_TIMEOUT=${BROWSER_TIMEOUT:-30000}

# 리포트 디렉토리 생성
mkdir -p $REPORT_DIR

log_info "OddGrocer Playwright 브라우저 테스트 시작"
log_info "대상 URL: $BASE_URL"
log_info "타임스탬프: $TIMESTAMP"

# 브라우저 테스트 메뉴
show_browser_menu() {
    echo ""
    echo "=== OddGrocer 브라우저 테스트 메뉴 ==="
    echo "1) 메인 → 매장 이동 브라우저 테스트"
    echo "2) 전체 사용자 여정 테스트"
    echo "3) 모바일 성능 테스트"
    echo "4) 크로스 브라우저 테스트"
    echo "5) 병렬 브라우저 테스트"
    echo "6) 커스텀 시나리오 테스트"
    echo "0) 종료"
    echo "====================================="
}

# 브라우저 선택
select_browser() {
    echo ""
    echo "=== 브라우저 선택 ==="
    echo "1) Chromium (기본)"
    echo "2) Firefox"
    echo "3) WebKit (Safari)"
    echo "4) 모든 브라우저"
    echo "==================="
    read -p "브라우저를 선택하세요 (1-4): " browser_choice
    
    case $browser_choice in
        1) echo "chromium" ;;
        2) echo "firefox" ;;
        3) echo "webkit" ;;
        4) echo "all" ;;
        *) echo "chromium" ;;
    esac
}

# 부하 수준 선택
select_load_level() {
    echo ""
    echo "=== 부하 수준 선택 ==="
    echo "1) 가벼움 (2 가상사용자, 60초)"
    echo "2) 보통 (5 가상사용자, 120초)" 
    echo "3) 높음 (10 가상사용자, 180초)"
    echo "4) 커스텀"
    echo "======================"
    read -p "부하 수준을 선택하세요 (1-4): " load_choice
    
    case $load_choice in
        1) echo "light" ;;
        2) echo "medium" ;;
        3) echo "heavy" ;;
        4) echo "custom" ;;
        *) echo "light" ;;
    esac
}

# 커스텀 부하 설정
get_custom_load() {
    read -p "가상 사용자 수 입력: " vu_count
    read -p "테스트 지속 시간(초) 입력: " duration
    echo "$vu_count:$duration"
}

# Playwright 테스트 실행
run_playwright_test() {
    local scenario=$1
    local output_file=$2
    local browser_type=$3
    local load_level=$4
    
    log_browser "Playwright 테스트 실행: $scenario"
    log_info "브라우저: $browser_type, 부하수준: $load_level"
    
    # Artillery와 Playwright 통합 테스트
    local config_file="temp_browser_config_$TIMESTAMP.js"
    
    # 임시 설정 파일 생성
    create_browser_config "$scenario" "$browser_type" "$load_level" "$config_file"
    
    # Artillery 실행
    artillery run "$config_file" --output "$output_file"
    
    if [ $? -eq 0 ]; then
        log_success "브라우저 테스트 완료: $scenario"
        
        # HTML 리포트 생성
        local html_file="${output_file%.json}.html"
        artillery report "$output_file" --output "$html_file"
        log_success "브라우저 리포트 생성: $html_file"
        
        # 스크린샷 및 비디오 처리
        process_browser_artifacts
    else
        log_error "브라우저 테스트 실패: $scenario"
        return 1
    fi
    
    # 임시 파일 정리
    rm -f "$config_file"
}

# 브라우저 설정 파일 생성
create_browser_config() {
    local scenario=$1
    local browser_type=$2  
    local load_level=$3
    local config_file=$4
    
    # 부하 수준에 따른 설정
    local arrival_rate=2
    local duration=60
    
    case $load_level in
        "light")
            arrival_rate=2
            duration=60
            ;;
        "medium")
            arrival_rate=5
            duration=120
            ;;
        "heavy")
            arrival_rate=10
            duration=180
            ;;
        "custom")
            local custom_config=$(get_custom_load)
            arrival_rate=$(echo $custom_config | cut -d: -f1)
            duration=$(echo $custom_config | cut -d: -f2)
            ;;
    esac
    
    cat > "$config_file" << EOF
module.exports = {
  config: {
    target: '$BASE_URL',
    engines: {
      playwright: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        contextOptions: {
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          isMobile: true,
          hasTouch: true
        }
      }
    },
    phases: [
      {
        duration: $duration,
        arrivalRate: $arrival_rate,
        name: 'Browser Test - $scenario'
      }
    ]
  },
  scenarios: [
    {
      name: '$scenario Browser Test',
      engine: 'playwright',
      testFunction: 'browserTest'
    }
  ]
};

async function browserTest(page, vuContext, events) {
  const startTime = Date.now();
  
  try {
    await page.goto('$BASE_URL/main?id=2', {
      waitUntil: 'networkidle',
      timeout: $BROWSER_TIMEOUT
    });
    
    const mainLoadTime = Date.now() - startTime;
    events.emit('counter', 'browser.main_load_time', mainLoadTime);
    
    await page.waitForTimeout(3000);
    
    try {
      await page.goto('$BASE_URL/store/175', {
        waitUntil: 'networkidle',
        timeout: $BROWSER_TIMEOUT
      });
      
      const storeLoadTime = Date.now() - startTime;
      events.emit('counter', 'browser.store_load_time', storeLoadTime);
      
      await page.waitForTimeout(2000);
      
      events.emit('counter', 'browser.journey_success', 1);
      
    } catch (error) {
      console.error('Store navigation failed:', error);
      events.emit('counter', 'browser.navigation_failed', 1);
    }
    
  } catch (error) {
    console.error('Browser test failed:', error);
    events.emit('counter', 'browser.test_failed', 1);
  }
}

module.exports.browserTest = browserTest;
EOF
}

# 브라우저 아티팩트 처리
process_browser_artifacts() {
    log_info "브라우저 테스트 아티팩트 처리 중..."
    
    # Playwright 리포트 디렉토리 확인
    if [ -d "test-results" ]; then
        mv test-results "$REPORT_DIR/test-results_$TIMESTAMP"
        log_success "테스트 결과 이동 완료"
    fi
    
    if [ -d "playwright-report" ]; then
        mv playwright-report "$REPORT_DIR/playwright-report_$TIMESTAMP"
        log_success "Playwright 리포트 이동 완료"
    fi
}

# 성능 분석 실행
run_performance_analysis() {
    local scenario=$1
    
    log_info "성능 분석 실행: $scenario"
    
    # 페이지 성능 메트릭 수집
    cat > "temp_performance_$TIMESTAMP.js" << 'EOF'
const { chromium } = require('playwright');

async function performanceTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  // Performance Observer 설정
  await page.addInitScript(() => {
    window.performanceMetrics = {
      navigationStart: performance.timeOrigin,
      metrics: []
    };
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.performanceMetrics.metrics.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          entryType: entry.entryType
        });
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'paint', 'measure'] });
  });
  
  await page.goto(process.env.BASE_URL + '/main?id=2');
  await page.waitForLoadState('networkidle');
  
  const metrics = await page.evaluate(() => window.performanceMetrics);
  console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
  
  await browser.close();
}

performanceTest().catch(console.error);
EOF

    node "temp_performance_$TIMESTAMP.js" > "$REPORT_DIR/performance_$TIMESTAMP.json"
    rm -f "temp_performance_$TIMESTAMP.js"
    
    log_success "성능 분석 완료"
}

# 메인 로직
main() {
    while true; do
        show_browser_menu
        read -p "선택하세요 (0-6): " choice
        
        case $choice in
            1)
                browser=$(select_browser)
                load=$(select_load_level)
                run_playwright_test "main-to-store" "$REPORT_DIR/browser-main-store_$TIMESTAMP.json" "$browser" "$load"
                ;;
            2)
                browser=$(select_browser)
                load=$(select_load_level)
                run_playwright_test "user-journey" "$REPORT_DIR/browser-user-journey_$TIMESTAMP.json" "$browser" "$load"
                ;;
            3)
                log_info "모바일 성능 테스트 실행..."
                run_performance_analysis "mobile-performance"
                run_playwright_test "mobile-performance" "$REPORT_DIR/mobile-performance_$TIMESTAMP.json" "chromium" "medium"
                ;;
            4)
                log_info "크로스 브라우저 테스트 실행..."
                browsers=("chromium" "firefox" "webkit")
                for browser in "${browsers[@]}"; do
                    log_info "테스트 실행 - 브라우저: $browser"
                    run_playwright_test "cross-browser" "$REPORT_DIR/cross-browser-${browser}_$TIMESTAMP.json" "$browser" "light"
                done
                ;;
            5)
                log_info "병렬 브라우저 테스트 실행..."
                run_playwright_test "parallel-test" "$REPORT_DIR/parallel-browser_$TIMESTAMP.json" "chromium" "heavy"
                ;;
            6)
                read -p "시나리오 이름 입력: " custom_scenario
                browser=$(select_browser)
                load=$(select_load_level)
                run_playwright_test "$custom_scenario" "$REPORT_DIR/custom-${custom_scenario}_$TIMESTAMP.json" "$browser" "$load"
                ;;
            0)
                log_info "브라우저 테스트 도구를 종료합니다."
                break
                ;;
            *)
                log_error "잘못된 선택입니다. 다시 선택해주세요."
                ;;
        esac
        
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
    done
}

# 의존성 확인
check_browser_dependencies() {
    if ! command -v artillery &> /dev/null; then
        log_error "Artillery가 설치되어 있지 않습니다."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        exit 1
    fi
    
    # Playwright 브라우저 설치 확인
    log_info "Playwright 브라우저 의존성 확인 중..."
    npx playwright install --with-deps
    
    log_success "모든 브라우저 의존성이 확인되었습니다."
}

# 스크립트 시작
echo "🎭 OddGrocer Playwright 브라우저 테스트 도구"
echo "=============================================="

check_browser_dependencies
main

log_success "브라우저 테스트 완료! 리포트는 $REPORT_DIR 폴더에서 확인하세요."