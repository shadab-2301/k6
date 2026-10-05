# API & UI Performance Testing - How It Works

## Overview

The performance testing framework automatically tests your **API endpoints** and **web UI** to identify bottlenecks and performance issues before they impact users.

---

## 🔄 API Testing Flow

### Test Execution Process

```
┌─────────────────────────────────────────────────────────┐
│  1. LOAD CONFIGURATION                                   │
│     ├─ Read config/endpoints.json                       │
│     ├─ Select environment (dev/staging/prod)            │
│     └─ Set virtual users, duration, ramp-up time        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. RAMP-UP PHASE (Virtual Users Increase)              │
│     ├─ Start with 0 users                               │
│     ├─ Gradually increase to target (e.g., 10 users)    │
│     ├─ Duration: 10 seconds (default)                   │
│     └─ Allows system to stabilize                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. SUSTAINED LOAD PHASE (Testing)                       │
│     ├─ Maintain constant virtual users                  │
│     ├─ Execute configured endpoints repeatedly          │
│     ├─ Each user makes requests in sequence:            │
│     │  • GET /posts                                     │
│     │  • Sleep 1 second                                 │
│     │  • GET /posts/{id}                                │
│     │  • Sleep 1 second                                 │
│     │  • POST /posts (create)                           │
│     │  • Sleep 2 seconds                                │
│     └─ Duration: 30 seconds (default)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. RAMP-DOWN PHASE (Gradual User Reduction)            │
│     ├─ Reduce from target to 0 users                    │
│     ├─ Duration: 5 seconds (default)                    │
│     └─ Clean shutdown of test                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  5. METRICS COLLECTION & ANALYSIS                        │
│     ├─ Response times (min, max, P95, P99)             │
│     ├─ Success/failure rates                            │
│     ├─ Per-endpoint performance                         │
│     ├─ Error details with timestamps                    │
│     └─ Custom metrics (duration, error count)           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  6. REPORT GENERATION                                    │
│     ├─ Console output (real-time summary)               │
│     ├─ JSON file (raw metrics)                          │
│     ├─ HTML Report (interactive dashboard)              │
│     └─ Issues detection & recommendations               │
└─────────────────────────────────────────────────────────┘
```

### Example API Test Scenario (10 Virtual Users, 30 seconds)

```
Virtual Users: 10 concurrent users
Duration: 30 seconds sustained load
Total Requests: ~300+ (depends on endpoint complexity)

Timeline:
├─ 0-10s:   Ramp up (0→10 users)
├─ 10-40s:  Sustained load (10 users making requests)
└─ 40-45s:  Ramp down (10→0 users)

Each User Flow:
1. GET /posts        → Response: 200, Time: 245ms
2. Sleep 1s
3. GET /posts/1      → Response: 200, Time: 180ms
4. Sleep 1s
5. POST /posts       → Response: 201, Time: 420ms
6. Sleep 2s
7. [Repeat from step 1]

Metrics Captured per Request:
├─ Status Code (200, 201, 404, 500, etc.)
├─ Response Time (milliseconds)
├─ Response Size (bytes)
├─ Time to First Byte (TTFB)
├─ Lookup Time (DNS resolution)
├─ Connect Time (TCP connection)
├─ TLS Handshake Time (if HTTPS)
└─ Request/Response Bodies (full content)
```

### What Gets Measured

**Response Time Distribution:**
```
Min:    150ms      (Fastest response)
Average: 312ms     (Mean of all responses)
P50:     290ms     (Median - 50% of requests are faster)
P75:     340ms     (75% of requests are faster than this)
P95:     450ms     ⚠️ KEY METRIC - 95% of requests are faster
P99:     620ms     (99% of requests are faster)
Max:     1200ms    (Slowest response)
```

**Success/Failure Analysis:**
```
Total Requests:     305
Successful (200):   301 (98.7%)
Failed (5xx):       3 (1%)
Errors (4xx):       1 (0.3%)
Timeouts:           0
```

**Per-Endpoint Breakdown:**
```
GET /posts
├─ Requests: 100
├─ P95: 350ms
├─ Errors: 0
└─ Status: ✅ PASS

GET /posts/{id}
├─ Requests: 100
├─ P95: 280ms
├─ Errors: 0
└─ Status: ✅ PASS

POST /posts
├─ Requests: 100
├─ P95: 520ms
├─ Errors: 3 (3%)
└─ Status: ⚠️ WARNING
```

---

## 🌐 UI Testing Flow

### Browser-Based Testing

```
┌─────────────────────────────────────────────────────────┐
│  1. BROWSER INITIALIZATION                               │
│     ├─ Launch Chromium browser instance                 │
│     ├─ Create isolated context per user                 │
│     ├─ Set viewport size                                │
│     └─ Configure timeouts                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. PAGE NAVIGATION                                      │
│     ├─ Navigate to target URL                           │
│     ├─ Wait for network idle (all requests complete)    │
│     ├─ Measure page load time                           │
│     └─ Capture browser console errors                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. PAGE INTERACTION                                     │
│     ├─ Find and click buttons                           │
│     ├─ Fill form inputs                                 │
│     ├─ Scroll through content                           │
│     ├─ Wait for dynamic content                         │
│     └─ Track interaction timing                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. WEB VITALS MEASUREMENT                               │
│     ├─ CLS (Cumulative Layout Shift)                    │
│     │  └─ Measure visual stability                      │
│     ├─ FID (First Input Delay)                          │
│     │  └─ Measure responsiveness                        │
│     ├─ LCP (Largest Contentful Paint)                   │
│     │  └─ Measure visual loading progress               │
│     └─ TTFB (Time to First Byte)                        │
│        └─ Measure backend response                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  5. VALIDATION & CHECKS                                  │
│     ├─ Verify page loaded correctly                     │
│     ├─ Check for broken elements                        │
│     ├─ Validate page title and content                  │
│     ├─ Ensure no JavaScript errors                      │
│     └─ Check network requests status                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  6. CLEANUP & NEXT ITERATION                             │
│     ├─ Close browser tab/context                        │
│     ├─ Free resources                                   │
│     └─ Proceed to next virtual user                     │
└─────────────────────────────────────────────────────────┘
```

### Example UI Test Scenario (5 Virtual Users)

```
Virtual Users: 5 concurrent browser sessions
Duration: 30 seconds

User 1 Actions:
1. Navigate to https://example.com
   └─ Load Time: 2.3s
   └─ Items Loaded: All
   
2. Interact - Click "Sign Up" button
   └─ Interaction Time: 150ms
   
3. Web Vitals Check:
   ├─ CLS: 0.05 ✅ (Good - < 0.1)
   ├─ FID: 45ms ✅ (Good - < 100ms)
   ├─ LCP: 2.1s ✅ (Good - < 2.5s)
   └─ TTFB: 450ms ✅ (Good - < 600ms)

4. Form Interaction - Enter email
   └─ Form Input Time: 280ms
   
5. Cleanup & Close
   └─ Total Session Time: 3.8s

[Same flow repeated for Users 2-5 in parallel]
```

### UI Metrics Captured

**Page Load Performance:**
```
Navigation Start:        0ms
DOM Interactive:         850ms
DOM Complete:           1200ms
Page Load Complete:     2300ms
First Paint:            600ms
First Contentful Paint: 850ms
Largest Contentful Paint: 2100ms
```

**Web Vitals Scores:**
```
CLS (Cumulative Layout Shift)
├─ Score: 0.05
├─ Status: ✅ GOOD (< 0.1)
└─ Impact: No visual instability observed

FID (First Input Delay)
├─ Score: 45ms
├─ Status: ✅ GOOD (< 100ms)
└─ Impact: Page responds quickly to clicks

LCP (Largest Contentful Paint)
├─ Score: 2.1s
├─ Status: ✅ GOOD (< 2.5s)
└─ Impact: Main content loads reasonably fast
```

**User Interactions:**
```
Button Clicks:        5 actions, avg 150ms
Form Inputs:          3 actions, avg 280ms
Page Navigation:      1 action, 2300ms
Element Visibility:   All checked, 100% pass
```

---

## 📊 Test Execution Example

### Running an API Test

**Command:**
```bash
run.bat api --env staging --users 20 --duration 60
```

**Real-time Output:**
```
Running API Performance Test...

     http_reqs......................: 1247   41.27/s
     http_req_duration..............: avg=312ms   min=145ms  med=290ms  max=1854ms  p(95)=450ms  p(99)=620ms
     http_req_failed................: 0.00%  ✓
     http_req_connecting............: avg=5ms    min=0ms    med=0ms    max=45ms
     http_req_tls_handshaking.......: avg=28ms   min=0ms    med=0ms    max=85ms
     
     api_duration...................: avg=312ms   min=145ms  med=290ms  max=1854ms
     api_errors......................: 0
     api_success.....................: 100.00%
     
     GET /posts
     ├─ Requests: 415
     ├─ Success: 100%
     ├─ P95: 380ms
     └─ Status: ✅ PASS
     
     POST /posts
     ├─ Requests: 416
     ├─ Success: 98%
     ├─ P95: 520ms
     └─ Status: ⚠️ WARNING (3 errors)
     
     DELETE /posts/{id}
     ├─ Requests: 416
     ├─ Success: 100%
     ├─ P95: 320ms
     └─ Status: ✅ PASS
```

### Running a UI Test

**Command:**
```bash
run.bat ui
```

**Real-time Output:**
```
Running UI Performance Test...

     browser_web_vital_cls.........: avg=0.05   min=0.01   max=0.12
     browser_web_vital_fid.........: avg=45ms   min=20ms   max=95ms
     browser_web_vital_lcp.........: avg=2.1s   min=1.8s   max=2.8s
     
     page_load_time.................: avg=2.3s   min=2.1s   max=2.8s
     interaction_time..............: avg=150ms  min=50ms   max=350ms
     
     Page Load:
     ├─ All pages loaded: 100%
     ├─ Average load time: 2.3s
     └─ Status: ✅ PASS
     
     Element Interactions:
     ├─ Button clicks: 5 actions
     ├─ Form inputs: 3 actions
     └─ Status: ✅ PASS
     
     Web Vitals:
     ├─ CLS: 0.05 ✅ (Good)
     ├─ FID: 45ms ✅ (Good)
     ├─ LCP: 2.1s ✅ (Good)
     └─ Overall: ✅ PASS
```

---

## 🎯 Test Results Interpretation

### When Tests PASS ✅
```
Threshold: P95 response < 500ms
Actual Result: P95 = 380ms
Status: ✅ PASS - API performance is good
```

### When Tests FAIL ⚠️
```
Threshold: P95 response < 500ms
Actual Result: P95 = 750ms
Status: ❌ FAIL - API performance degraded
```

### Performance Issues Detected

**Issue #1: High Response Time**
```
Observation:
├─ At 20 concurrent users
├─ /payment API response time jumped from 200ms to 750ms
├─ P95 exceeded threshold by 250ms

Likely Causes:
├─ Database query without indexes
├─ External API call timeout
├─ Insufficient server resources
└─ Memory leak under load

Recommended Action:
├─ Add database indexes
├─ Implement caching
├─ Scale infrastructure
└─ Re-run test after fix
```

**Issue #2: Increased Error Rate**
```
Observation:
├─ 3.2% of requests returned 500 errors
├─ Errors increased with higher user count
├─ Error messages: "Connection timeout"

Likely Causes:
├─ Server resource exhaustion
├─ Connection pool depletion
├─ Downstream service failure
└─ Load balancer misconfiguration

Recommended Action:
├─ Increase connection pool size
├─ Scale horizontally (add servers)
├─ Monitor downstream services
└─ Review load balancer settings
```

---

## 🔄 Complete Testing Workflow

```
┌──────────────────────────────────────────────────────┐
│           INITIAL TEST BASELINE                       │
│  Run test, collect metrics, document results         │
│  Example: P95 = 350ms, Error Rate = 0%               │
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│         IDENTIFY PERFORMANCE ISSUES                   │
│  If metrics < threshold: ✅ PASS                     │
│  If metrics > threshold: ⚠️ INVESTIGATE              │
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│          CREATE ISSUE REPORT                          │
│  ├─ Title: Issue description                        │
│  ├─ Observation: What was observed                  │
│  ├─ Impact: Business/user impact                    │
│  ├─ Solution: Recommended fixes                     │
│  └─ Priority: High/Medium/Low                       │
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│         IMPLEMENT FIXES                               │
│  ├─ Database optimization                           │
│  ├─ Caching implementation                          │
│  ├─ Code optimization                               │
│  └─ Infrastructure scaling                          │
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│        RE-RUN PERFORMANCE TEST                        │
│  Verify fix improved metrics                         │
│  Example: P95 improved from 750ms to 350ms           │
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│        VALIDATE & CLOSE ISSUE                         │
│  ✅ Metrics within threshold                         │
│  ✅ Performance improved                             │
│  ✅ Ready for deployment                             │
└──────────────────────────────────────────────────────┘
```

---

## 📈 Performance Testing Best Practices

### 1. Test Early & Often
- Run tests during development
- Test before each deployment
- Establish performance baselines
- Track trends over time

### 2. Simulate Real User Behavior
- Ramp up gradually (don't spike to max)
- Include realistic think time (sleeps between requests)
- Use actual data patterns
- Test multiple scenarios (happy path, edge cases)

### 3. Test Different Environments
```
Development  → Quick feedback, identify obvious issues
Staging      → Realistic environment, final validation
Production   → Limited load, monitor with real traffic
```

### 4. Analyze Results Systematically
- Don't just look at averages (use P95, P99)
- Check error rates and types
- Identify bottleneck endpoints
- Compare with baseline

### 5. Create Actionable Reports
- Document issues clearly
- Provide specific recommendations
- Include reproduction steps
- Include before/after metrics

---

## 🛠️ Commands Reference

### Run API Test
```bash
# Development
run.bat api --env dev

# Staging with 20 users
run.bat api --env staging --users 20

# Production (limited load)
run.bat api --env production --users 5
```

### Run UI Test
```bash
# Basic run
run.bat ui

# With custom duration
run.bat ui --duration 60
```

### Generate Reports
```bash
# Results automatically saved to:
results/api-summary.json
results/api-summary.txt
results/performance-report.html  ← Interactive HTML report
```

---

## 📊 Metrics You Should Track

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| P95 Response | < 500ms | 500-1000ms | > 1000ms |
| P99 Response | < 1000ms | 1000-2000ms | > 2000ms |
| Error Rate | < 0.5% | 0.5%-2% | > 2% |
| Success Rate | > 99% | 95-99% | < 95% |
| CLS (Web Vitals) | < 0.1 | 0.1-0.25 | > 0.25 |
| FID (Web Vitals) | < 100ms | 100-300ms | > 300ms |
| LCP (Web Vitals) | < 2.5s | 2.5-4s | > 4s |

This framework gives you **comprehensive performance visibility** across API and UI! 🚀
