const winston = require('winston');
const moment = require('moment');

// 로거 설정
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'reports/artillery.log' })
  ]
});

// 응답 시간 캡처 함수
function captureResponseTime(requestParams, response, context, ee, next) {
  const responseTime = response.timings.phases.total;
  const url = requestParams.url || requestParams.uri;
  
  logger.info(`Response time for ${url}: ${responseTime}ms`);
  
  // 커스텀 메트릭 발생
  ee.emit('counter', 'custom.response_time', responseTime);
  ee.emit('counter', 'custom.requests_completed', 1);
  
  // 응답 시간에 따른 분류
  if (responseTime > 5000) {
    ee.emit('counter', 'custom.slow_responses', 1);
    logger.warn(`Slow response detected: ${url} took ${responseTime}ms`);
  } else if (responseTime > 2000) {
    ee.emit('counter', 'custom.medium_responses', 1);
  } else {
    ee.emit('counter', 'custom.fast_responses', 1);
  }
  
  return next();
}

// 메인페이지 로드 로깅
function logMainPageLoad(requestParams, response, context, ee, next) {
  const statusCode = response.statusCode;
  const responseTime = response.timings.phases.total;
  
  logger.info(`Main page loaded - Status: ${statusCode}, Time: ${responseTime}ms`);
  
  if (statusCode === 200) {
    ee.emit('counter', 'main_page.successful_loads', 1);
  } else {
    ee.emit('counter', 'main_page.failed_loads', 1);
    logger.error(`Main page load failed with status: ${statusCode}`);
  }
  
  return next();
}

// 매장페이지 로드 로깅
function logStorePageLoad(requestParams, response, context, ee, next) {
  const statusCode = response.statusCode;
  const responseTime = response.timings.phases.total;
  
  logger.info(`Store page loaded - Status: ${statusCode}, Time: ${responseTime}ms`);
  
  if (statusCode === 200) {
    ee.emit('counter', 'store_page.successful_loads', 1);
  } else {
    ee.emit('counter', 'store_page.failed_loads', 1);
    logger.error(`Store page load failed with status: ${statusCode}`);
  }
  
  return next();
}

// 랜덤 문자열 생성
function generateRandomString(context, events, done) {
  const randomStrings = [
    'main-app', 'vendor', 'chunk', 'runtime', 'polyfills',
    'framework', 'commons', 'shared', 'pages'
  ];
  
  context.vars.$randomString = () => {
    return randomStrings[Math.floor(Math.random() * randomStrings.length)] + 
           Math.random().toString(36).substring(2, 8);
  };
  
  return done();
}

// 랜덤 단어 생성 (검색용)
function generateRandomWord(context, events, done) {
  const searchWords = [
    '과일', '야채', '고기', '생선', '우유', '빵', '쌀', '라면',
    '치킨', '피자', '샐러드', '음료', '과자', '아이스크림', '케이크'
  ];
  
  context.vars.$randomWord = () => {
    return searchWords[Math.floor(Math.random() * searchWords.length)];
  };
  
  return done();
}

// UUID 생성
function generateRandomUuid(context, events, done) {
  context.vars.$randomUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  return done();
}

// 가상 사용자 세션 초기화
function initializeVirtualUser(context, events, done) {
  const userProfiles = [
    { type: 'casual_browser', behavior: 'slow' },
    { type: 'active_shopper', behavior: 'fast' },
    { type: 'comparison_shopper', behavior: 'thorough' }
  ];
  
  const profile = userProfiles[Math.floor(Math.random() * userProfiles.length)];
  context.vars.userProfile = profile;
  
  logger.info(`Virtual user initialized with profile: ${profile.type}`);
  events.emit('counter', `users.${profile.type}`, 1);
  
  return done();
}

// 에러 핸들링
function handleError(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    const errorType = response.statusCode >= 500 ? 'server_error' : 'client_error';
    ee.emit('counter', `errors.${errorType}`, 1);
    
    logger.error(`Error ${response.statusCode} for ${requestParams.url}`);
    
    // 특정 에러 코드별 처리
    switch (response.statusCode) {
      case 404:
        ee.emit('counter', 'errors.not_found', 1);
        break;
      case 429:
        ee.emit('counter', 'errors.rate_limited', 1);
        break;
      case 500:
        ee.emit('counter', 'errors.internal_server', 1);
        break;
      case 503:
        ee.emit('counter', 'errors.service_unavailable', 1);
        break;
    }
  }
  
  return next();
}

// 부하 테스트 시작 시 호출
function beforeRequest(requestParams, context, ee, next) {
  // 요청 전 로깅
  logger.debug(`Making request to: ${requestParams.url}`);
  
  // 타임스탬프 추가
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Test-Timestamp'] = moment().toISOString();
  requestParams.headers['X-Virtual-User-Id'] = context.vars.$uuid || 'anonymous';
  
  return next();
}

// 성능 지표 수집
function collectPerformanceMetrics(requestParams, response, context, ee, next) {
  const metrics = {
    dns: response.timings.phases.dns || 0,
    tcp: response.timings.phases.tcp || 0,
    tls: response.timings.phases.tls || 0,
    request: response.timings.phases.request || 0,
    firstByte: response.timings.phases.firstByte || 0,
    download: response.timings.phases.download || 0,
    total: response.timings.phases.total || 0
  };
  
  // 각 단계별 메트릭 발생
  Object.keys(metrics).forEach(phase => {
    ee.emit('histogram', `performance.${phase}`, metrics[phase]);
  });
  
  logger.debug(`Performance metrics for ${requestParams.url}: ${JSON.stringify(metrics)}`);
  
  return next();
}

module.exports = {
  captureResponseTime,
  logMainPageLoad,
  logStorePageLoad,
  generateRandomString,
  generateRandomWord,
  generateRandomUuid,
  initializeVirtualUser,
  handleError,
  beforeRequest,
  collectPerformanceMetrics
};