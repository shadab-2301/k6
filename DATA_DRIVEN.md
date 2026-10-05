# Data-Driven Testing Guide

## Overview

The API test is now **data-driven** with support for **multiple environments**. All endpoints and thresholds are defined in `config/endpoints.json`.

## Configuration File Structure

The `config/endpoints.json` file contains environment-specific configurations:

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "endpoints": [
      {
        "name": "Get All Posts",
        "method": "GET",
        "path": "/posts",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500,
          "errorRate": 0.1
        }
      },
      ...
    ]
  },
  "staging": { ... },
  "production": { ... }
}
```

## Environment Switching

### Run Tests for Different Environments

```bash
# Development (default)
k6 run tests/api.js

# Staging
k6 run -e ENVIRONMENT=staging tests/api.js

# Production
k6 run -e ENVIRONMENT=production tests/api.js
```

### Using the Runner Scripts

**Windows:**
```bash
# Development
run.bat api --env dev

# Staging
run.bat api --env staging

# Production
run.bat api --env production
```

**macOS/Linux:**
```bash
# Development
./run.sh api --env dev

# Staging
./run.sh api --env staging

# Production
./run.sh api --env production
```

## Configuration Fields

### Endpoint Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive endpoint name |
| `method` | string | Yes | HTTP method: GET, POST, PUT, DELETE, PATCH |
| `path` | string | Yes | API endpoint path (appended to baseUrl) |
| `expectedStatus` | number | No | Expected HTTP response code (default: 200) |
| `payload` | object | No | Request body for POST/PUT/PATCH methods |
| `thresholds` | object | No | Performance thresholds for this endpoint |

### Thresholds Object

| Field | Type | Description |
|-------|------|-------------|
| `duration` | number | Expected maximum response time in milliseconds |
| `errorRate` | number | Acceptable error rate (0-1) |

## Adding New Endpoints

Edit `config/endpoints.json` and add to the desired environment:

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "endpoints": [
      ...existing endpoints...,
      {
        "name": "Create User",
        "method": "POST",
        "path": "/users",
        "expectedStatus": 201,
        "payload": {
          "name": "John Doe",
          "email": "john@example.com",
          "age": 30
        },
        "thresholds": {
          "duration": 800,
          "errorRate": 0.1
        }
      }
    ]
  }
}
```

## Customizing for Your API

### Step 1: Update Base URLs

Edit `config/endpoints.json` for each environment:

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000"
  },
  "staging": {
    "baseUrl": "https://staging-api.yourcompany.com"
  },
  "production": {
    "baseUrl": "https://api.yourcompany.com"
  }
}
```

### Step 2: Define Your Endpoints

Replace the example endpoints with your API endpoints:

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "endpoints": [
      {
        "name": "Get Dashboard",
        "method": "GET",
        "path": "/dashboard",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Get User Profile",
        "method": "GET",
        "path": "/users/me",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 300
        }
      },
      {
        "name": "Update Profile",
        "method": "PUT",
        "path": "/users/me",
        "expectedStatus": 200,
        "payload": {
          "name": "John Doe",
          "bio": "Test bio"
        },
        "thresholds": {
          "duration": 600
        }
      }
    ]
  }
}
```

### Step 3: Run Tests

```bash
# Test development environment
k6 run -e ENVIRONMENT=dev tests/api.js

# Test staging environment
k6 run -e ENVIRONMENT=staging tests/api.js

# Test production (with fewer virtual users)
k6 run -e ENVIRONMENT=production -e VIRTUAL_USERS=5 tests/api.js
```

## Advanced Options

### Custom Configuration File Path

```bash
k6 run -e CONFIG_FILE=./custom-config.json -e ENVIRONMENT=dev tests/api.js
```

### Override Base URL

```bash
k6 run -e ENVIRONMENT=staging -e API_URL=https://custom-api.example.com tests/api.js
```

### Combine Multiple Options

```bash
k6 run \
  -e ENVIRONMENT=production \
  -e VIRTUAL_USERS=20 \
  -e DURATION=60s \
  -e RAMP_UP=15s \
  tests/api.js
```

## Test Results

Results are saved with environment context:
- `results/api-summary.json` - Full metrics in JSON
- `results/api-summary.txt` - Human-readable summary

Example output shows:
- Environment and base URL
- Number of endpoints tested
- Response time percentiles (P95, P99)
- Success/failure rates
- All endpoints and their thresholds

## Authentication & Headers

To add authentication to all requests, modify the endpoint payloads or update the test script:

### Example: Add Bearer Token

Edit `tests/api.js` to add headers:

```javascript
function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'your-token'}`
  };
  
  let response;
  switch (endpoint.method.toUpperCase()) {
    case 'GET':
      response = http.get(url, { headers });
      break;
    case 'POST':
      response = http.post(url, JSON.stringify(endpoint.payload || {}), { headers });
      break;
    // ... other methods
  }
}
```

Then run with token:
```bash
k6 run -e AUTH_TOKEN=your-token tests/api.js
```

## Multi-Environment Workflow

### Example: Test Entire Pipeline

```bash
#!/bin/bash

# Test dev environment
echo "Testing Development..."
k6 run -e ENVIRONMENT=dev tests/api.js

# Test staging environment
echo "Testing Staging..."
k6 run -e ENVIRONMENT=staging -e VIRTUAL_USERS=10 tests/api.js

# Test production (limited load)
echo "Testing Production..."
k6 run -e ENVIRONMENT=production -e VIRTUAL_USERS=5 -e DURATION=30s tests/api.js

echo "All tests completed!"
```

## Troubleshooting

### Endpoint not found (404)

**Issue:** Test fails with 404 status codes
**Solution:** Verify the `path` in `endpoints.json` matches your API

### Timeout errors

**Issue:** Requests timeout or take longer than threshold
**Solution:** Increase `thresholds.duration` for the endpoint or reduce `VIRTUAL_USERS`

### Authentication failures (401)

**Issue:** Requests return 401 Unauthorized
**Solution:** Ensure `AUTH_TOKEN` or authentication headers are properly configured

### Wrong environment running

**Issue:** Test runs against wrong base URL
**Solution:** Always specify `-e ENVIRONMENT=env-name` or check default in config

## Best Practices

1. **Start with dev** - Always test locally first
2. **Staging before production** - Mirror production with realistic load
3. **Version your config** - Keep endpoints.json in version control
4. **Document changes** - Update endpoint definitions when API changes
5. **Environment-specific thresholds** - Use stricter thresholds for production
6. **Regular endpoint updates** - Keep configuration in sync with API

## Performance Baselines by Environment

### Development
- Lower thresholds (more lenient)
- Higher virtual users acceptable
- Quick feedback loop

### Staging
- Medium thresholds
- Realistic load testing
- Identify bottlenecks before production

### Production
- Strict thresholds
- Lower virtual users (avoid impact)
- Monitor and validate
