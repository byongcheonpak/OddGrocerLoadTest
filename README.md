# OddGrocer Artillery 부하테스트 프로젝트

## 📋 프로젝트 개요
OddGrocer 쇼핑몰 사이트 (https://m.oddgrocer.com) 를 위한 종합적인 Artillery 부하테스트 프로젝트입니다.

## 🎯 주요 테스트 시나리오
1. **HTTP 부하 테스트**
   - 메인페이지 로드 테스트
   - 메인 → 매장(175) 이동 시나리오
   - API 엔드포인트 성능 테스트

2. **Playwright 브라우저 테스트**
   - 실제 브라우저 기반 사용자 여정 시뮬레이션
   - 메인페이지 → 매장페이지 이동 테스트
   - 크로스 브라우저 호환성 테스트

## 🚀 시작하기

### 의존성 설치
```bash
npm install
npx playwright install
```

### 환경 설정
`.env` 파일에서 다음 설정을 확인/수정하세요:
- `BASE_URL`: 테스트 대상 URL (기본값: https://m.oddgrocer.com)
- 기타 부하 테스트 관련 설정

## 📊 테스트 실행

### HTTP 테스트
```bash
# 대화형 메뉴로 실행
./scripts/run-http-tests.sh

# 또는 직접 실행
npm run test:http      # 메인페이지 테스트
npm run test:store     # 매장 이동 테스트
npm run test:api       # API 엔드포인트 테스트
npm run test:all       # 모든 HTTP 테스트
```

### 브라우저 테스트
```bash
# 대화형 메뉴로 실행
./scripts/run-browser-tests.sh

# 또는 직접 실행
npm run test:browser   # 브라우저 테스트
```

### 부하 프로필별 테스트
```bash
npm run test:spike     # 스파이크 테스트
npm run test:stress    # 스트레스 테스트
```

## 📁 프로젝트 구조
```
oddgrocer-artillery-loadTest/
├── package.json                    # 프로젝트 설정 및 의존성
├── artillery.config.js             # Artillery 기본 설정
├── .env                           # 환경 변수
├── scenarios/
│   ├── http/                      # HTTP 테스트 시나리오
│   │   ├── main-page-load.yml     # 메인페이지 부하테스트
│   │   ├── store-navigation.yml   # 매장 이동 테스트
│   │   └── api-endpoints.yml      # API 테스트
│   └── playwright/                # 브라우저 테스트
│       ├── browser-main-to-store.js
│       └── user-journey.js
├── functions/
│   ├── custom-functions.js        # Artillery 커스텀 함수
│   └── playwright-helpers.js      # Playwright 헬퍼
├── data/
│   ├── test-users.csv             # 테스트 사용자 데이터
│   └── products.json              # 상품 테스트 데이터
├── config/
│   ├── load-profiles.yml          # 부하 프로필 설정
│   └── playwright.config.js       # Playwright 설정
├── scripts/
│   ├── run-http-tests.sh          # HTTP 테스트 실행 스크립트
│   └── run-browser-tests.sh       # 브라우저 테스트 실행 스크립트
└── reports/                       # 테스트 결과 리포트
```

## 📈 리포트 생성
```bash
# HTML 리포트 생성
npm run report

# 모든 리포트 통합
npm run report:all

# 리포트 정리
npm run clean
```

## ⚙️ 설정 커스터마이징

### 부하 프로필 수정
`config/load-profiles.yml`에서 다양한 부하 시나리오를 설정할 수 있습니다:
- light_load: 가벼운 부하
- medium_load: 중간 부하  
- heavy_load: 높은 부하
- spike_load: 스파이크 테스트
- stress_load: 스트레스 테스트

### 테스트 데이터 수정
- `data/test-users.csv`: 사용자 프로필 데이터
- `data/products.json`: 상품 및 카테고리 데이터

## 🔧 커스텀 함수
`functions/custom-functions.js`에서 제공하는 기능:
- 응답 시간 측정 및 분류
- 에러 핸들링 및 로깅
- 성능 메트릭 수집
- 랜덤 데이터 생성

## 📝 모니터링 및 메트릭
- 실시간 성능 지표 수집
- 에러율 및 응답시간 추적
- 커스텀 메트릭 및 카운터
- 상세한 로깅 및 분석

## 🚨 주의사항
1. 실제 프로덕션 환경에서 테스트할 때는 사전 승인을 받으세요
2. 테스트 강도를 점진적으로 증가시키세요
3. 서버 리소스 모니터링을 병행하세요
4. 테스트 후 결과를 팀과 공유하세요

## 📚 추가 자료
- [Artillery 공식 문서](https://artillery.io/docs/)
- [Playwright 공식 문서](https://playwright.dev/)
- [부하 테스트 모범 사례](https://artillery.io/docs/guides/guides/load-testing-best-practices.html)
