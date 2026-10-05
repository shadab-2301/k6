# Data-Driven Performance Testing Setup Complete ✅

Your k6 performance testing framework has been upgraded with **data-driven testing** and **environment switching** capabilities.

## What's New

### 1. **Configuration File** (`config/endpoints.json`)
- Centralized endpoint definitions
- Environment-specific configurations (dev, staging, production)
- Per-endpoint performance thresholds
- Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)

### 2. **Enhanced API Test** (`tests/api.js`)
- Reads endpoints from JSON configuration file
- Environment switching support
- Automatic iteration through all configured endpoints
- Data-driven test execution
- Detailed error reporting per endpoint
- Per-endpoint metrics tracking

### 3. **Updated Test Runners**
- `run.bat` (Windows) - Now supports `--env` option
- `run.sh` (Unix/Linux/macOS) - Now supports `--env` option

### 4. **New Documentation**
- `DATA_DRIVEN.md` - Complete guide to data-driven testing
- `CONFIG_EXAMPLES.md` - Real-world configuration examples

## Quick Start

### Run Tests by Environment

**Development (default):**
```bash
k6 run tests/api.js
# or
run.bat api --env dev
```

**Staging:**
```bash
k6 run -e ENVIRONMENT=staging tests/api.js
# or
run.bat api --env staging
```

**Production:**
```bash
k6 run -e ENVIRONMENT=production -e VIRTUAL_USERS=5 tests/api.js
# or
run.bat api --env production --users 5
```

## Configuration Structure

The `config/endpoints.json` file defines your API structure:

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "endpoints": [
      {
        "name": "Get Posts",
        "method": "GET",
        "path": "/posts",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500,
          "errorRate": 0.1
        }
      }
    ]
  }
}
```

## Customization Steps

### Step 1: Update Base URLs
Edit `config/endpoints.json`:
```json
{
  "dev": {
    "baseUrl": "http://localhost:3000"
  },
  "staging": {
    "baseUrl": "https://staging-api.example.com"
  },
  "production": {
    "baseUrl": "https://api.example.com"
  }
}
```

### Step 2: Add Your Endpoints
Replace example endpoints with your actual API endpoints:
```json
{
  "dev": {
    "endpoints": [
      {
        "name": "List Users",
        "method": "GET",
        "path": "/users",
        "expectedStatus": 200,
        "thresholds": {
          "duration": 500
        }
      },
      {
        "name": "Create User",
        "method": "POST",
        "path": "/users",
        "expectedStatus": 201,
        "payload": {
          "name": "John",
          "email": "john@example.com"
        },
        "thresholds": {
          "duration": 800
        }
      }
    ]
  }
}
```

### Step 3: Run Tests
```bash
# Development
run.bat api --env dev

# Staging with custom load
run.bat api --env staging --users 20 --duration 60

# Production (minimal load)
run.bat api --env production --users 5 --duration 30
```

## Features

### ✅ Data-Driven Testing
- All endpoints defined in a single configuration file
- No hardcoded endpoint paths in test code
- Easy to add/remove/modify endpoints
- Centralized endpoint management

### ✅ Environment Switching
- Support for multiple environments (dev, staging, production)
- Environment-specific configurations
- Different base URLs per environment
- Different performance thresholds per environment

### ✅ Flexible HTTP Methods
- GET, POST, PUT, DELETE, PATCH
- Automatic method routing
- Request body support via `payload` field

### ✅ Per-Endpoint Thresholds
- Custom performance expectations per endpoint
- Duration thresholds (milliseconds)
- Error rate thresholds
- Automatic threshold validation

### ✅ Detailed Reporting
- Per-endpoint error messages
- Response status validation
- Detailed console output
- JSON summary file for analysis

## Example: Running Tests Across All Environments

```bash
# Test Development
echo "=== Testing Development ==="
run.bat api --env dev --users 10

# Test Staging
echo "=== Testing Staging ==="
run.bat api --env staging --users 20

# Test Production (limited)
echo "=== Testing Production ==="
run.bat api --env production --users 5 --duration 30

echo "=== All tests completed ==="
```

## File Structure

```
performace/
├── tests/
│   ├── api.js                    # Data-driven API test (UPDATED)
│   └── ui.js                     # UI test
├── config/
│   ├── endpoints.json            # Endpoint definitions (NEW)
│   └── .env.example              # Environment variables
├── results/                      # Test results
├── run.bat                       # Windows runner (UPDATED)
├── run.sh                        # Unix runner (UPDATED)
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick start guide
├── DATA_DRIVEN.md                # Data-driven testing guide (NEW)
├── CONFIG_EXAMPLES.md            # Configuration examples (NEW)
├── ADVANCED.md                   # Advanced configurations
└── .gitignore                    # Git ignore
```

## API Test Flow

```
Start Test
    ↓
Load Environment (dev/staging/production)
    ↓
Read Configuration File (endpoints.json)
    ↓
For Each Endpoint:
    ├─ Make HTTP Request (GET/POST/PUT/DELETE/PATCH)
    ├─ Record Duration
    ├─ Check Response Status
    ├─ Track Errors
    └─ Move to Next Endpoint
    ↓
Generate Report
    ├─ Console Output
    ├─ JSON Summary (results/api-summary.json)
    └─ Text Summary (results/api-summary.txt)
```

## Common Commands

```bash
# Development test (default)
run.bat api

# Staging test
run.bat api --env staging

# Production test with low load
run.bat api --env production --users 5

# Custom endpoint configuration
k6 run -e CONFIG_FILE=./custom-config.json tests/api.js

# Override base URL
run.bat api --env staging --url https://custom-api.example.com

# Combined options
run.bat api --env production --users 10 --duration 60 --ramp 20
```

## Testing Strategy

### Development
- High virtual users (test capacity)
- Longer duration tests
- Looser performance thresholds
- Frequent changes to endpoints

### Staging
- Realistic user load
- Production-like environment
- Realistic performance thresholds
- Verify before production deployment

### Production
- Low virtual users (minimize impact)
- Short duration tests
- Strict performance thresholds
- Regular monitoring and baseline comparison

## Next Steps

1. **Update URLs** - Edit `config/endpoints.json` with your actual URLs
2. **Add Endpoints** - Add your API endpoints to the configuration
3. **Set Thresholds** - Define realistic performance expectations
4. **Test Locally** - Run `run.bat api --env dev` to verify
5. **Test Staging** - Run `run.bat api --env staging` before production
6. **Monitor** - Use results to track performance over time

## Resources

- [DATA_DRIVEN.md](DATA_DRIVEN.md) - Complete data-driven testing guide
- [CONFIG_EXAMPLES.md](CONFIG_EXAMPLES.md) - Real-world configuration examples
- [ADVANCED.md](ADVANCED.md) - Advanced testing scenarios
- [K6 Documentation](https://k6.io/docs/)

## Support

For detailed information:
- **Data-Driven Testing**: See [DATA_DRIVEN.md](DATA_DRIVEN.md)
- **Configuration Examples**: See [CONFIG_EXAMPLES.md](CONFIG_EXAMPLES.md)
- **Advanced Features**: See [ADVANCED.md](ADVANCED.md)
- **K6 Docs**: Visit [k6.io/docs](https://k6.io/docs/)

---

**Your k6 framework is now fully data-driven and environment-aware!** 🚀
