# Quick Start Guide

Get up and running with k6 performance testing in 5 minutes.

## Step 1: Install k6

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Windows (MSI installer):**
Download from [k6.io downloads](https://github.com/grafana/k6/releases)

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install k6
```

**Verify Installation:**
```bash
k6 version
```

## Step 2: Configure Your Endpoints

Edit the test files to use your actual API/UI URLs:

**For API Testing** (`tests/api.js`):
```javascript
const BASE_URL = __ENV.API_URL || 'https://your-api.com';
```

**For UI Testing** (`tests/ui.js`):
```javascript
const BASE_URL = __ENV.UI_URL || 'https://your-website.com';
```

Or set via environment variable:
```bash
k6 run -e API_URL=https://your-api.com tests/api.js
```

## Step 3: Run Your First Test

### API Performance Test
```bash
# Windows
run.bat api

# macOS/Linux
./run.sh api
```

Or directly:
```bash
k6 run tests/api.js
```

### UI Performance Test
```bash
# Windows
run.bat ui

# macOS/Linux
./run.sh ui
```

Or directly:
```bash
k6 run tests/ui.js
```

## Step 4: Customize Test Parameters

### Adjust Load
```bash
# Windows
run.bat api --users 50 --duration 60

# macOS/Linux
./run.sh api --users 50 --duration 60

# Direct command
k6 run -e VIRTUAL_USERS=50 -e DURATION=60s tests/api.js
```

**Common Parameters:**
- `--users N` - Number of virtual users (default: 10)
- `--duration Ns` - Test duration in seconds (default: 30)
- `--url URL` - Target URL

## Step 5: View Results

Test results print to console and are saved in `results/` directory:
- `api-summary.json` - API test results
- `ui-summary.json` - UI test results

Sample output:
```
=== API Performance Test Results ===
Response Time - P95: 450ms, P99: 850ms
Failed Requests: 0.50%
Total Requests: 1250
Test Duration: 30.45s
```

## Common Commands

### Run Both Tests
```bash
run.bat all              # Windows
./run.sh all            # macOS/Linux
```

### Upload to K6 Cloud (requires account)
```bash
k6 cloud tests/api.js
```

### Run with High Load
```bash
k6 run -e VIRTUAL_USERS=200 tests/api.js
```

### Run with Custom Duration
```bash
k6 run -e DURATION=300s tests/api.js
```

## What Gets Tested?

### API Test Includes:
- GET requests (fetch all/single items)
- POST requests (create items)
- Response time analysis
- Error rate tracking
- Success metrics

### UI Test Includes:
- Page load time
- Element interactions
- Form submissions
- Web Vitals (Core Web Vitals)
- Navigation testing

## Next Steps

1. **Customize test scripts** - Edit `tests/api.js` and `tests/ui.js` for your endpoints
2. **Adjust thresholds** - Set realistic performance targets in the test options
3. **Create data files** - Add test data in `data/` directory for parameterized tests
4. **Set up CI/CD** - Integrate into your pipeline (see README.md)
5. **Read ADVANCED.md** - Learn advanced scenarios, authentication, data-driven tests

## Troubleshooting

### k6 command not found
Ensure k6 is installed and in your PATH:
```bash
k6 version
```

### Cannot connect to target URL
- Check the URL is correct and accessible
- Check network/firewall settings
- Verify the service is running

### Port already in use
K6 listens on local ports. Ensure they're available or close other services.

### Out of memory
Reduce virtual users or test duration:
```bash
k6 run -e VIRTUAL_USERS=5 -e DURATION=10s tests/api.js
```

## Need Help?

- Check [K6 Documentation](https://k6.io/docs/)
- Review test output messages
- Check `results/` directory for detailed metrics
- Read `ADVANCED.md` for complex scenarios

---

**Happy Load Testing! 🚀**
