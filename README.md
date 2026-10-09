# K6 Performance Testing Suite

A comprehensive performance testing framework using k6 for testing both APIs and UIs.

## Overview

This project includes:
- **API Performance Tests** (`tests/api.js`) - Load testing REST APIs with custom metrics
- **UI Performance Tests** (`tests/ui.js`) - Browser-based performance testing using k6's experimental browser module

## Command
-` npm run perf:batch:k6 -- --payment-type TPT --rail EFT --amount-min 10 --amount-max 150 --payments 3000 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 300s`

### Environment-driven batch flow

Only `SIT` and `UAT` are supported. Set the selected environment explicitly and
provide its credentials through the process environment or secrets store:

```text
UAT_LOGIN_PASSWORD=...
UAT_SINGLE_AUTH_COMPANY=...
UAT_SINGLE_AUTH_INI_LOGINGIN_ID=...
UAT_SINGLE_AUTH_INI_USERNAME=...
UAT_SINGLE_AUTH_INI_GCN=...
UAT_DUAL_AUTH_COMPANY=...
UAT_DUAL_AUTH_INI_LOGINGIN_ID=...
UAT_DUAL_AUTH_INI_USERNAME=...
UAT_DUAL_AUTH_INI_GCN=...
UAT_DUAL_AUTH_APP_LOGINGIN_ID=...
UAT_DUAL_AUTH_APP_USERNAME=...
UAT_DUAL_AUTH_APP_GCN=...
UAT_OTP=...
```

The first request is `POST https://apistg.secure.investec.com/auth` with
`{ "Username": UAT_SINGLE_AUTH_INI_LOGINGIN_ID, "Password": UAT_LOGIN_PASSWORD }`,
followed by `POST /auth/otp`. Single Auth SAS and downstream requests use only
the `UAT_SINGLE_AUTH_*` identity settings. Dual Auth initiator and approver
identities remain separate under `UAT_DUAL_AUTH_*`. Keep the password in the
process environment or secrets store, never in this repository.

Run it with the existing wrapper, for example:

```text
npm run perf:batch:k6 -- --env UAT --payment-type INT --rail INT --payments 1 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s
```

PowerShell also supports selecting the environment with `$env:ENV = "SIT"` or `$env:ENV = "UAT"`; the wrapper additionally accepts `-e ENV=SIT` and `-e ENV=UAT`. The checked-in UAT data is separated by payment type; add future EFT, RTGS, and payroll fixtures as separate files rather than changing the Internal fixture.

The script obtains SAS metadata from the selected environment's CAPI endpoint, passes every returned `uploadHeaders` value to the File
Manager `PUT`, and sends the CSV file bytes as the request body. The upload
requires HTTP `201`; it is not wrapped in JSON or multipart form data because
the SAS Blob endpoint expects the file body directly. Each SAS request uses a
single 36-character UUID `idempotency-key` reused for the logical SAS retry. XML is not uploaded. Every environment
must provide a CSV fixture; UAT Internal automatically uses the checked-in
`internal-transfer-batch-payment-v2.csv` fixture, while other environment and
payment-type combinations must provide `--batch-file` or an environment fixture.

//command to test invalid file
-`npm run perf:batch:k6 -- --payment-type TPT --rail EFT --amount-min 10 --amount-max 150 --payments 1 --iterations 1 --vus 1 --poll-timeout-ms 30000 --max-duration 90s --test-data invalid`

## Prerequisites

### Option 1: Local Installation
- [k6](https://k6.io/docs/getting-started/installation/) (v0.43.0 or higher)
- Node.js (optional, for script management)

### Option 2: Docker
- Docker and Docker Compose installed

## Installation

### Local Setup

1. Install k6:
   - **Windows (Chocolatey):** `choco install k6`
   - **macOS (Homebrew):** `brew install k6`
   - **Linux:** Follow [official docs](https://k6.io/docs/getting-started/installation/)

2. Verify installation:
   ```bash
   k6 version
   ```

3. Copy environment configuration:
   ```bash
   cp config/.env.example config/.env
   ```
   Edit `config/.env` with your target URLs and parameters.

## Running Tests

### API Performance Test

```bash
# Basic run
k6 run tests/api.js

# With custom API URL
k6 run -e API_URL=https://your-api.com tests/api.js

# With custom load parameters
k6 run -e API_URL=https://your-api.com -e VIRTUAL_USERS=50 -e DURATION=60s tests/api.js

# Upload results to k6 Cloud
k6 cloud tests/api.js
```

### UI Performance Test

```bash
# Basic run (requires k6 with browser module)
k6 run tests/ui.js

# With custom UI URL
k6 run -e UI_URL=https://your-app.com tests/ui.js

# With headless browser
k6 run --headless=true tests/ui.js
```

### Run Both Tests

```bash
# Sequential execution
npm run test:all

# Or manually
k6 run tests/api.js && k6 run tests/ui.js
```

### Using Docker

```bash
# Run API test
docker-compose run k6-api

# Run UI test
docker-compose run k6-ui

# Run both
docker-compose up
```

## Test Configuration

### API Test (tests/api.js)

**Default Configuration:**
- Virtual Users: 10
- Ramp-up Time: 10s
- Duration: 30s
- Ramp-down: 5s

**Performance Thresholds:**
- 95th percentile response time < 500ms
- 99th percentile response time < 1000ms
- Error rate < 10%
- Success rate > 95%

**Tests Included:**
- GET /posts - Fetch all posts
- GET /posts/{id} - Fetch specific post
- POST /posts - Create new post

**Custom Metrics:**
- `api_duration` - Response time trend
- `api_errors` - Error counter
- `api_success` - Success rate

### UI Test (tests/ui.js)

**Default Configuration:**
- Virtual Users: 5
- Duration: 30s

**Performance Checks:**
- Page loads successfully
- Page title exists
- Web Vitals (CLS, FID, LCP)
- Element interactions
- Form inputs

**Custom Metrics:**
- `page_load_time` - Time to load page
- `interaction_time` - Time for user interactions

## Environment Variables

Create a `.env` file in the `config/` directory or set directly:

```bash
# API Testing
API_URL=https://api.example.com
VIRTUAL_USERS=10
DURATION=30s
RAMP_UP=10s

# UI Testing
UI_URL=https://example.com

# K6 Cloud (optional)
K6_CLOUD_TOKEN=your_token_here
```

## Customization

### Modifying API Tests

Edit `tests/api.js` to:
1. Change the `BASE_URL` default
2. Add/remove API endpoints in the test functions
3. Adjust performance thresholds in the `options.thresholds` object
4. Customize load stages in `options.stages`

Example - Add custom endpoint:
```javascript
group('GET /users', () => {
  const response = http.get(`${BASE_URL}/users`);
  
  check(response, {
    'status is 200': (r) => r.status === 200
  });
});
```

### Modifying UI Tests

Edit `tests/ui.js` to:
1. Change the `BASE_URL` default
2. Customize selectors for your UI elements
3. Add more interaction groups
4. Adjust Web Vitals thresholds

Example - Add custom element click:
```javascript
group('Click login button', () => {
  page.click('button[id="login"]');
  check(page, {
    'login page loaded': () => page.url().includes('/dashboard')
  });
});
```

## Results

Test results are saved in the `results/` directory:
- `api-summary.json` - API test results
- `ui-summary.json` - UI test results

### Viewing Results

```bash
# Pretty print API results
cat results/api-summary.json | jq
```

### K6 Cloud

For cloud-based result storage and analysis:

1. Get your cloud token from [app.k6.io](https://app.k6.io)
2. Set environment variable: `K6_CLOUD_TOKEN=your_token`
3. Run: `k6 cloud tests/api.js`

## Common Issues

### k6: command not found
- Ensure k6 is installed and in your PATH
- Reinstall using your package manager

### Browser module not available
- Update k6: `k6 version --check`
- Browser module requires k6 v0.43.0+

### Permission denied (Docker)
- Run docker commands with appropriate permissions or add your user to docker group

### Timeout errors
- Increase timeout in test configuration
- Check network connectivity to target URLs

## Performance Tuning

### For Better Results

1. **Increase Virtual Users Gradually:**
   ```bash
   k6 run -e VIRTUAL_USERS=100 tests/api.js
   ```

2. **Longer Test Duration:**
   ```bash
   k6 run -e DURATION=5m tests/api.js
   ```

3. **Multiple Stages (Spike Test):**
   Edit `options.stages` in the test file

4. **Add Think Time:**
   Adjust `sleep()` calls between requests

## Monitoring

### Real-time Monitoring

```bash
# View live metrics in terminal
k6 run tests/api.js
```

### With Grafana & InfluxDB (Advanced)

See k6 documentation for integration setup.

## Best Practices

1. **Start Small:** Test with low user counts first
2. **Baseline First:** Establish baseline metrics before optimization
3. **Realistic Scenarios:** Create tests that mirror actual user behavior
4. **Monitor Infrastructure:** Watch server resources during tests
5. **Iterate:** Make small changes and measure impact
6. **Use Thresholds:** Define acceptable performance metrics
7. **Regular Testing:** Schedule periodic performance tests

## Resources

- [K6 Official Documentation](https://k6.io/docs/)
- [K6 API Reference](https://k6.io/docs/javascript-api/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [K6 Community](https://k6.io/community/)

## Support

For issues or questions:
1. Check the [K6 Documentation](https://k6.io/docs/)
2. Review test output and error messages
3. Check your target endpoints are accessible
4. Verify environment variables are correctly set

## License

This performance testing suite is provided as-is for testing purposes.


npm run perf:batch:dual:k6 -- --env UAT --payment-type TPT --rail EFT --payments 10 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s

# dual_auth
`npm run perf:batch:dual:k6 -- --env UAT --payment-type TPT --rail EFT --payments 10 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s --future 7`



# Single Auth
`npm run perf:batch:k6 -- --env UAT --payment-type TPT --rail EFT --payments 10 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s --future 7`


# Mixed batch upload (several payment types and rails in one file)
Add `--mix` with comma-separated `TYPE/RAIL:COUNT` entries. All entries go into one CSV upload; the backend splits it into one batch per rail/type, and each batch is initiated with its own rail. `COUNT` is optional and defaults to `--payments`. `--payment-type` and `--rail` are ignored when `--mix` is set. UAT only; each type needs its `<TYPE>_BatchSingleAuth.json` (or `_BatchDualAuth.json`) test data.

`npm run perf:batch:k6 -- --env UAT --mix "TPT/EFT:5,TPT/PAYSHAP:5,ADHOC/RTGS:2,IAB/EFT:3" --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s`

`npm run perf:batch:dual:k6 -- --env UAT --mix "TPT/EFT:5,PRLEX/PAYSHAP:5" --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s`

# Single auth, with three payment types and all three rails:



`npm run perf:batch:k6 -- --env UAT --mix "TPT/EFT:5,TPT/PAYSHAP:5,ADHOC/RTGS:2,IAB/EFT:3" --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s`

# Dual auth:

`npm run perf:batch:dual:k6 -- --env UAT --mix "TPT/EFT:5,PRLSD/PAYSHAP:3,PRLEX/EFT:2" --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s`

# Using --payments as the count for every entry (here, 10 each, so 30 payments in total):

`npm run perf:batch:k6 -- --env UAT --mix "TPT/EFT,ADHOC/PAYSHAP,IAB/EFT" --payments 10 --iterations 1 --vus 1 --poll-timeout-ms 300000 --max-duration 30s`


Rules for the mix

# Use at least two entries, and don't repeat the same type/rail pair. TPT/EFT and TPT/PAYSHAP together is fine.

`--payment-type and --rail are ignored when --mix is used.
UAT only. Add --future 7 to test SCHEDULED instead of SENT.
In Windows PowerShell, write the separator as '--' or use npm.cmd. Otherwise PowerShell drops the flags.

For a first UAT run, start with two entries, such as "TPT/EFT:2,TPT/PAYSHAP:2". That confirms the backend splits the file into one batch per rail before you try larger mixes.

In Windows PowerShell, quote the separator (`'--'`) or use `npm.cmd`, otherwise PowerShell drops the flags before npm sees them.

# File validation wait (upload -> PENDINIT)
By default the run waits for the uploaded file to reach PENDINIT with no time limit, logging `[k6][PENDINIT][WAITING]` every 30 seconds. It stops early only if the file ends in a failed/rejected validation status. To limit the wait, pass `--fileValid <seconds>`:

`npm run perf:batch:k6 -- --env UAT --payment-type TPT --rail EFT --payments 10 --iterations 1 --vus 1 --poll-timeout-ms 300000 --fileValid 300`

`--poll-timeout-ms` still limits the later polls (records reaching SENT/SCHEDULED).

# Final status (SENT/SCHED) polling speed
Each poll reads every payment record of the batch (100 per page). Pages of all BKREFs are fetched together in parallel, 20 at a time by default, so the time to Final Status Observed is close to when the payments actually reached SENT/SCHED. Each poll logs `[k6][RECORDS][POLL] pass=… records=… passMs=…`. Change the parallelism with `--records-concurrency <n>`, e.g. `--records-concurrency 20`.

Dual auth reads the final status in two steps: it polls get file batches (one request returns every BK's status, logged as `[k6][BATCH-STATUS]`) until every BK is final, then reads the FT records once to confirm each FT's actual status. The BK-level time is used for Final Status Observed only when the BKs were seen moving to SENT/SCHED and the FT records confirm it (`[k6][FINAL-STATUS] … source=…`); otherwise the records-based time is used.
