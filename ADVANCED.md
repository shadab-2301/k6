# K6 Advanced Configuration Guide

## Scenario Configurations

### 1. Smoke Test (Validate Basic Functionality)
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 5 },  // Ramp up to 5 users
    { duration: '5m', target: 5 },  // Stay at 5 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(99)<1500'],
  },
};
```

### 2. Load Test (Sustained Load)
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 50 },  // Ramp up to 50 users
    { duration: '10m', target: 50 }, // Sustained at 50 users
    { duration: '5m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  },
};
```

### 3. Stress Test (Breaking Point)
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.1'],
  },
};
```

### 4. Spike Test (Sudden Traffic Increase)
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 100 }, // Sudden spike
    { duration: '5m', target: 100 },
    { duration: '10s', target: 0 },
  ],
};
```

### 5. Soak Test (Extended Duration)
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 30 },
    { duration: '1h', target: 30 },  // Run for 1 hour
    { duration: '5m', target: 0 },
  ],
};
```

## Custom Metrics Examples

### Track Specific Endpoints
```javascript
import { Trend, Rate, Gauge, Counter } from 'k6/metrics';

const postsResponseTime = new Trend('posts_response_time');
const commentsResponseTime = new Trend('comments_response_time');
const postsErrorRate = new Rate('posts_error_rate');

export default function () {
  // Posts endpoint
  let res1 = http.get(`${BASE_URL}/posts`);
  postsResponseTime.add(res1.timings.duration);
  postsErrorRate.add(res1.status !== 200);

  // Comments endpoint
  let res2 = http.get(`${BASE_URL}/comments`);
  commentsResponseTime.add(res2.timings.duration);
}
```

### Track User Session Duration
```javascript
import { Trend } from 'k6/metrics';

const sessionDuration = new Trend('session_duration');

export default function () {
  const startTime = Date.now();
  
  // Simulate user session with multiple requests
  http.get(`${BASE_URL}/page1`);
  sleep(1);
  http.get(`${BASE_URL}/page2`);
  sleep(1);
  http.get(`${BASE_URL}/page3`);
  
  const duration = Date.now() - startTime;
  sessionDuration.add(duration);
}
```

## Authentication Examples

### Basic Auth
```javascript
import http from 'k6/http';
import { check } from 'k6';
import encoding from 'k6/encoding';

const credentials = {
  username: 'user',
  password: 'pass'
};

const encodedCredentials = encoding.b64encode(`${credentials.username}:${credentials.password}`);

export default function () {
  const response = http.get(`${BASE_URL}/protected`, {
    headers: {
      'Authorization': `Basic ${encodedCredentials}`
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200
  });
}
```

### JWT Token
```javascript
import http from 'k6/http';

let token;

export default function () {
  // First, get a token
  if (!token) {
    const loginRes = http.post(`${BASE_URL}/login`, {
      email: 'user@example.com',
      password: 'password'
    });
    token = loginRes.json('access_token');
  }

  // Use token for subsequent requests
  const response = http.get(`${BASE_URL}/protected`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200
  });
}
```

## Data-Driven Testing

### Using Test Data Array
```javascript
import http from 'k6/http';
import { check } from 'k6';

const testData = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  { id: 3, name: 'Bob' },
  { id: 4, name: 'Alice' }
];

export default function () {
  const data = testData[Math.floor(Math.random() * testData.length)];
  
  const response = http.get(`${BASE_URL}/users/${data.id}`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'correct name': (r) => r.json('name') === data.name
  });
}
```

### Reading from File (CSV)
```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { papaparse } from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { open } from 'k6/fs';

const csvData = new SharedArray('users', function () {
  return papaparse.parse(open('data/users.csv')).data;
});

export default function () {
  const row = csvData[Math.floor(Math.random() * csvData.length)];
  
  const response = http.get(`${BASE_URL}/users/${row[0]}`);
  
  check(response, {
    'status is 200': (r) => r.status === 200
  });
}
```

## Error Handling & Retry Logic

### Handle Response Errors
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const response = http.get(`${BASE_URL}/api/endpoint`);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'body has content': (r) => r.body.length > 0,
    'response time < 1s': (r) => r.timings.duration < 1000,
  }) || console.log(`Request failed: ${response.status}`);

  // Log response details on failure
  if (response.status !== 200) {
    console.error(`Status: ${response.status}, Body: ${response.body}`);
  }
}
```

### Retry Logic
```javascript
import http from 'k6/http';
import { check } from 'k6';

function makeRequest(url, maxRetries = 3) {
  let response;
  let attempt = 0;

  while (attempt < maxRetries) {
    response = http.get(url);
    if (response.status === 200) {
      return response;
    }
    attempt++;
    console.log(`Attempt ${attempt} failed, retrying...`);
  }

  return response;
}

export default function () {
  const response = makeRequest(`${BASE_URL}/api/endpoint`);
  
  check(response, {
    'status is 200': (r) => r.status === 200
  });
}
```

## Custom Check Functions

### Reusable Check Utility
```javascript
import { check } from 'k6';

function checkResponse(response, expectedStatus = 200) {
  return check(response, {
    'status is correct': (r) => r.status === expectedStatus,
    'has content': (r) => r.body.length > 0,
    'response time acceptable': (r) => r.timings.duration < 1000,
    'no error in body': (r) => !r.body.includes('error')
  });
}

export default function () {
  const res = http.get(`${BASE_URL}/api/endpoint`);
  checkResponse(res, 200);
}
```

## Performance Testing Patterns

### Test with Different Payloads
```javascript
import http from 'k6/http';
import { group } from 'k6';

const payloads = [
  { size: 'small', data: 'x'.repeat(100) },
  { size: 'medium', data: 'x'.repeat(1000) },
  { size: 'large', data: 'x'.repeat(10000) }
];

export default function () {
  payloads.forEach(payload => {
    group(`Testing with ${payload.size} payload`, () => {
      http.post(`${BASE_URL}/upload`, payload.data);
    });
  });
}
```

## Reporting & Analysis

### Custom Summary Handler
```javascript
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlSummary(data)
  };
}

function textSummary(data, options) {
  let summary = '\n=== Performance Test Results ===\n';
  // Add your custom formatting
  return summary;
}
```

## Environment-Specific Testing

### Different Test Configurations Per Environment
```bash
# Development
k6 run -e ENV=dev -e API_URL=http://localhost:3000 tests/api.js

# Staging
k6 run -e ENV=staging -e API_URL=https://staging-api.example.com tests/api.js

# Production
k6 run -e ENV=prod -e API_URL=https://api.example.com tests/api.js
```

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 JavaScript API](https://k6.io/docs/javascript-api/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/)
- [K6 Community Libraries](https://jslib.k6.io/)
