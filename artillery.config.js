module.exports = {
  config: {
    target: process.env.BASE_URL || 'https://m.oddgrocer.com',
    plugins: {
      'metrics-by-endpoint': {},
      'publish-metrics': [
        {
          type: 'datadog',
          tags: ['environment:test', 'service:oddgrocer']
        }
      ]
    },
    phases: [
      {
        name: 'Warm up',
        duration: 60,
        arrivalRate: 2,
        rampTo: 5
      },
      {
        name: 'Steady load',
        duration: 300,
        arrivalRate: 10
      },
      {
        name: 'Peak load',
        duration: 120,
        arrivalRate: 20,
        rampTo: 50
      }
    ],
    defaults: {
      headers: {
        'User-Agent': 'Artillery Load Test - OddGrocer Mobile',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    },
    http: {
      timeout: 30,
      pool: 50,
      maxSockets: 50
    },
    processor: './functions/custom-functions.js'
  }
};