# SDWAN Speedtest Application - Comprehensive Test Plan

## Executive Summary

This test plan addresses the current state of the SDWAN speedtest application, which has existing Playwright E2E tests with multiple failures due to API path mismatches and missing functionality. The application uses a dual-port architecture (8888/Gold, 8889/Silver) critical for SD-WAN transport testing.

**Current Status**: 52 tests exist, ~15% failing due to:
- API endpoint path mismatches (`/api/test/*` vs `/api/*`)
- Missing `/api/test/info` endpoint
- WebSocket transport identification issues
- Incomplete response body structures

---

## 1. Issue Analysis

### 1.1 Critical Issues (Blocking Tests)

| Issue | Severity | Impact | Affected Tests |
|-------|----------|--------|----------------|
| API path mismatch: `/api/test/download` should be `/api/download` | **Critical** | All download tests failing (404) | performance-tests.spec.js (5 tests) |
| API path mismatch: `/api/test/upload` should be `/api/upload` | **Critical** | All upload tests failing (404) | performance-tests.spec.js (3 tests) |
| API path mismatch: `/api/test/latency` should be `/api/latency` | **Critical** | All latency tests failing (404) | performance-tests.spec.js (2 tests) |
| Missing `/api/test/info` endpoint | **Critical** | Info endpoint tests failing | performance-tests.spec.js (2 tests), dual-port.spec.js (1 test) |
| WebSocket doesn't include transport in echoed messages | **High** | WebSocket transport identification failing | websocket-tests.spec.js (3 tests) |
| `/api/test/info` response missing `transport` field | **Medium** | Incomplete API contract validation | dual-port.spec.js (1 test) |

### 1.2 Functional Areas Status

| Component | Tests Exist | Tests Pass | Coverage | Priority |
|-----------|-------------|------------|----------|----------|
| Dual-port architecture | ✅ Yes | ✅ 7/8 (87%) | Good | P0 |
| Transport selector UI | ✅ Yes | ✅ 100% | Good | P1 |
| Download streaming | ✅ Yes | ❌ 0/5 (0%) | Unknown | P0 |
| Upload handling | ✅ Yes | ❌ 0/3 (0%) | Unknown | P0 |
| HTTP latency | ✅ Yes | ❌ 0/2 (0%) | Unknown | P1 |
| WebSocket latency | ✅ Yes | ⚠️ Partial | Incomplete | P1 |
| Rate limiting | ✅ Yes | ⚠️ Unknown | Unknown | P2 |
| MTU testing | ❌ No | N/A | None | P2 |
| Diagnostics (traceroute/MTR) | ❌ No | N/A | None | P3 |
| Test modes (Basic/Detailed/Ludacris) | ⚠️ UI only | ⚠️ Partial | None | P2 |
| File upload functionality | ❌ No | N/A | None | P3 |

### 1.3 Root Cause Analysis

**Test Design Issue**: Tests were written against an assumed API structure (`/api/test/*`) that differs from actual implementation (`/api/*`). This suggests:
1. Tests were created without implementation reference
2. No API specification document exists
3. Integration between test suite and application is incomplete

**Missing Functionality**: The `/api/test/info` endpoint was assumed to exist but wasn't implemented. This is needed for:
- Test validation of transport detection
- Client-side transport verification
- Health checks beyond the basic `/health` endpoint

---

## 2. Test Strategy

### 2.1 Approach

**Phase 1: Stabilization (Immediate)**
1. Fix API path mismatches in tests OR add missing endpoints (implementation decision needed)
2. Fix WebSocket transport identification
3. Achieve 100% passing baseline tests
4. Establish CI/CD integration

**Phase 2: Coverage Enhancement (Week 1-2)**
1. Add missing test scenarios for existing features
2. Add negative test cases (error handling, invalid inputs)
3. Add performance benchmarks
4. Add network condition simulation

**Phase 3: Advanced Features (Week 2-4)**
1. Test Ludacris mode (MTU, diagnostics, traceroute)
2. Test cross-transport comparison ("Both" mode)
3. Add load/stress testing
4. Add security testing (rate limits, input validation)

### 2.2 Testing Pyramid

```
              /\
             /  \  E2E UI Tests (10%)
            /____\  - Full user flows
           /      \  - Transport selection
          /        \  - Multi-test scenarios
         /__________\
        /            \ Integration Tests (30%)
       /  API Tests   \ - All endpoints
      /   WebSocket    \ - Streaming behavior
     /    Middleware    \ - Rate limiting
    /______________________\
   /                        \ Unit Tests (60%)
  /  Route handlers          \ - Business logic
 /   Utilities, Helpers       \ - Config validation
/    Data transformation        \ - Error handling
/________________________________\
```

### 2.3 Test Environment Requirements

#### Network Conditions to Simulate
- **Baseline**: Localhost (low latency, high bandwidth)
- **MPLS-like**: 20-50ms latency, 100 Mbps, 0.01% loss
- **Internet-like**: 50-200ms latency, variable bandwidth, 0.1-1% loss
- **Poor network**: High latency (>200ms), packet loss (>2%), jitter

#### Test Data Fixtures
- Pre-generated random data files (1MB, 10MB, 100MB) for upload tests
- Approved diagnostic targets list
- Mock SD-WAN policy configurations
- Sample test result data for UI rendering

#### Infrastructure Requirements
- Docker Compose setup (already exists)
- Both ports (8888, 8889) accessible
- Sufficient bandwidth for performance tests (1 Gbps+)
- Time synchronization for accurate latency measurements

---

## 3. Playwright Implementation

### 3.1 Current Test Structure

```
tests/e2e/
├── dual-port.spec.js           # Port detection, transport headers (7/8 passing)
├── transport-selector.spec.js  # UI transport selection (8/8 passing)
├── performance-tests.spec.js   # Download/upload/latency (0/15 passing)
├── websocket-tests.spec.js     # WebSocket latency (partial)
└── rate-limiting.spec.js       # Rate limit enforcement (unknown)
```

### 3.2 Immediate Fixes Required

#### Fix #1: Update API Paths in Tests

```javascript
// performance-tests.spec.js - CHANGE FROM:
const response = await request.get('http://localhost:8888/api/test/download', {
  params: { duration: 5, chunkSize: 1048576 }
});

// TO:
const response = await request.get('http://localhost:8888/api/download', {
  params: { duration: 5, chunkSize: 1048576 }
});
```

**Files to update**: `performance-tests.spec.js` (all download/upload/latency endpoint references)

#### Fix #2: Create Missing /api/test/info Endpoint OR Remove Tests

**Option A: Implement the endpoint** (Recommended)

```javascript
// src/routes/testInfo.js (NEW FILE)
const express = require('express');
const router = express.Router();
const config = require('../config/config');

router.get('/', (req, res) => {
  res.json({
    transport: req.transport,
    port: req.socket.localPort,
    dataCenter: config.dataCenterId,
    version: '1.0.0',
    capabilities: {
      download: true,
      upload: true,
      latency: true,
      websocket: true,
      diagnostics: config.enableDiagnostics
    }
  });
});

module.exports = router;
```

Then add to `src/server.js:77`:
```javascript
const testInfoRoutes = require('./routes/testInfo');
app.use('/api/test/info', testInfoRoutes);
```

**Option B: Update tests to use `/health` endpoint** (Workaround)

#### Fix #3: Add Transport to WebSocket Messages

```javascript
// src/server.js - UPDATE WebSocket handler (line 124):
wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] ||
                  req.socket.remoteAddress;
  const port = req.socket.localPort;
  const transport = port === config.goldPort ? 'gold' :
                    port === config.silverPort ? 'silver' : 'unknown';

  logger.info(`WebSocket connection established from ${clientIp} on ${transportName}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Echo back with transport information
      ws.send(JSON.stringify({
        ...data,
        type: 'pong',
        transport: transport,
        timestamp: data.timestamp
      }));
    } catch (e) {
      // If not JSON, just echo back
      ws.send(message);
    }
  });
  // ... rest of handler
});
```

### 3.3 New Test Cases Needed

#### 3.3.1 Streaming Validation Tests

```javascript
// tests/e2e/streaming-validation.spec.js (NEW FILE)
const { test, expect } = require('@playwright/test');

test.describe('Download Streaming Behavior', () => {
  test('should stream data incrementally, not buffer', async ({ request }) => {
    const chunks = [];
    const startTime = Date.now();

    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: 5, chunkSize: 1048576 }
    });

    // Monitor response stream
    const reader = response.body().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push({
        timestamp: Date.now() - startTime,
        size: value.length
      });
    }

    // Verify chunks arrived incrementally (not all at once)
    expect(chunks.length).toBeGreaterThan(10);

    // First chunk should arrive quickly
    expect(chunks[0].timestamp).toBeLessThan(100);

    // Last chunk should arrive near test duration
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.timestamp).toBeGreaterThan(4500);
    expect(lastChunk.timestamp).toBeLessThan(6000);
  });

  test('should not create server-side files during download', async ({ request }) => {
    // This test would need access to server filesystem OR check metrics
    // For now, verify no /tmp files growth (would need Bash integration)
  });
});
```

#### 3.3.2 Error Handling Tests

```javascript
// tests/e2e/error-handling.spec.js (NEW FILE)
test.describe('Error Handling', () => {
  test('should reject invalid duration values', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: 999999 } // Exceeds MAX_TEST_DURATION
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('duration');
  });

  test('should reject negative duration', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: -5 }
    });

    expect(response.status()).toBe(400);
  });

  test('should handle upload size exceeding MAX_UPLOAD_SIZE', async ({ request }) => {
    const largeData = Buffer.alloc(500 * 1024 * 1024); // 500MB

    const response = await request.post('http://localhost:8888/api/upload', {
      data: largeData,
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    expect(response.status()).toBe(413); // Payload Too Large
  });

  test('should enforce concurrent test limits', async ({ request }) => {
    // Start MAX_CONCURRENT_TESTS + 5 tests simultaneously
    const promises = Array(25).fill(0).map(() =>
      request.get('http://localhost:8888/api/download', {
        params: { duration: 10 }
      }).catch(err => err.response)
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status() === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

#### 3.3.3 Transport Comparison Tests

```javascript
// tests/e2e/transport-comparison.spec.js (NEW FILE)
test.describe('Gold vs Silver Transport Comparison', () => {
  test('should measure performance difference between transports', async ({ request }) => {
    // Download test on Gold
    const goldStart = Date.now();
    const goldResponse = await request.get('http://localhost:8888/api/download', {
      params: { duration: 5, chunkSize: 1048576 }
    });
    const goldDuration = Date.now() - goldStart;
    const goldData = await goldResponse.body();

    // Download test on Silver
    const silverStart = Date.now();
    const silverResponse = await request.get('http://localhost:8889/api/download', {
      params: { duration: 5, chunkSize: 1048576 }
    });
    const silverDuration = Date.now() - silverStart;
    const silverData = await silverResponse.body();

    // Verify both completed
    expect(goldResponse.status()).toBe(200);
    expect(silverResponse.status()).toBe(200);

    // Log performance comparison (in real network, Gold should be faster)
    console.log(`Gold: ${goldData.length} bytes in ${goldDuration}ms`);
    console.log(`Silver: ${silverData.length} bytes in ${silverDuration}ms`);

    // On localhost, both should be similar, but both should work
    expect(goldData.length).toBeGreaterThan(0);
    expect(silverData.length).toBeGreaterThan(0);
  });
});
```

#### 3.3.4 Test Mode Orchestration Tests

```javascript
// tests/e2e/test-modes.spec.js (NEW FILE)
test.describe('Test Mode Execution', () => {
  test('Basic mode should complete within 60 seconds', async ({ page }) => {
    await page.goto('http://localhost:8888');

    // Select Basic mode
    await page.selectOption('#test-mode', 'basic');
    await page.click('#start-test-button');

    const startTime = Date.now();

    // Wait for test completion
    await page.waitForSelector('.test-complete', { timeout: 65000 });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(60000);

    // Verify basic results displayed
    await expect(page.locator('.download-speed')).toBeVisible();
    await expect(page.locator('.upload-speed')).toBeVisible();
    await expect(page.locator('.latency')).toBeVisible();
  });

  // Similar tests for Detailed and Ludacris modes
});
```

### 3.4 Test Fixtures and Helpers

#### Fixtures for Common Operations

```javascript
// tests/fixtures/speedtest-fixtures.js (NEW FILE)
const { test as base } = require('@playwright/test');
const crypto = require('crypto');

exports.test = base.extend({
  // Generate random test data
  testData: async ({}, use) => {
    const data = {
      small: crypto.randomBytes(1024 * 1024), // 1MB
      medium: crypto.randomBytes(10 * 1024 * 1024), // 10MB
      large: crypto.randomBytes(50 * 1024 * 1024), // 50MB
    };
    await use(data);
  },

  // Helper to run test on both transports
  bothTransports: async ({ request }, use) => {
    const runOnBoth = async (testFn) => {
      const goldResult = await testFn('http://localhost:8888', 'gold');
      const silverResult = await testFn('http://localhost:8889', 'silver');
      return { gold: goldResult, silver: silverResult };
    };
    await use(runOnBoth);
  },

  // Helper to measure throughput
  measureThroughput: async ({}, use) => {
    const measure = (bytes, durationMs) => {
      const bitsPerSecond = (bytes * 8) / (durationMs / 1000);
      return {
        mbps: (bitsPerSecond / 1_000_000).toFixed(2),
        bytes,
        durationMs
      };
    };
    await use(measure);
  },
});
```

### 3.5 Playwright Configuration Updates

```javascript
// playwright.config.js - ENHANCED VERSION
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  timeout: 30000, // 30s default timeout
  expect: {
    timeout: 10000 // 10s for assertions
  },

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox and WebKit if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  webServer: {
    command: 'npm start',
    port: 8888,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
    // Health check for both ports
    url: 'http://localhost:8888/health',
  },
});
```

---

## 4. Additional Testing Tools

### 4.1 Unit Testing with Jest

**Current Status**: Package.json includes Jest but no unit tests exist.

**Recommended Unit Tests**:

```javascript
// tests/unit/portDetection.test.js (NEW)
const portDetectionMiddleware = require('../../src/middleware/portDetection');

describe('Port Detection Middleware', () => {
  test('should set transport to gold for port 8888', () => {
    const req = { socket: { localPort: 8888 } };
    const res = {};
    const next = jest.fn();

    portDetectionMiddleware(req, res, next);

    expect(req.transport).toBe('gold');
    expect(next).toHaveBeenCalled();
  });

  test('should set transport to silver for port 8889', () => {
    const req = { socket: { localPort: 8889 } };
    const res = {};
    const next = jest.fn();

    portDetectionMiddleware(req, res, next);

    expect(req.transport).toBe('silver');
    expect(next).toHaveBeenCalled();
  });

  test('should set transport to unknown for other ports', () => {
    const req = { socket: { localPort: 3000 } };
    const res = {};
    const next = jest.fn();

    portDetectionMiddleware(req, res, next);

    expect(req.transport).toBe('unknown');
  });
});

// tests/unit/config.test.js (NEW)
describe('Configuration', () => {
  test('should load default values when env vars not set', () => {
    // Test config defaults
  });

  test('should parse APPROVED_TARGETS as array', () => {
    // Test CSV parsing
  });
});

// tests/unit/logger.test.js (NEW)
describe('Logger', () => {
  test('should output JSON format', () => {
    // Test structured logging
  });
});
```

### 4.2 API Testing with Playwright Request Context

Already using `request` fixture effectively. Expand with:

```javascript
// tests/api/download-api.spec.js (NEW)
test.describe('Download API', () => {
  test('should return correct Content-Type header', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: 1 }
    });

    expect(response.headers()['content-type']).toBe('application/octet-stream');
  });

  test('should include transport headers', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: 1 }
    });

    expect(response.headers()['x-transport-type']).toBeTruthy();
    expect(response.headers()['x-transport-port']).toBeTruthy();
    expect(response.headers()['x-data-center']).toBeTruthy();
  });

  test('should handle HEAD requests', async ({ request }) => {
    const response = await request.head('http://localhost:8888/api/download');
    expect(response.status()).toBe(200);
  });
});
```

### 4.3 Performance Monitoring

**Tool**: Playwright Performance API + Custom Metrics

```javascript
// tests/performance/throughput-benchmarks.spec.js (NEW)
const { test, expect } = require('@playwright/test');

test.describe('Performance Benchmarks', () => {
  test('Download throughput should exceed 100 Mbps on localhost', async ({ request }) => {
    const response = await request.get('http://localhost:8888/api/download', {
      params: { duration: 10, chunkSize: 2097152 } // 2MB chunks
    });

    const startTime = Date.now();
    const data = await response.body();
    const duration = Date.now() - startTime;

    const mbps = (data.length * 8) / (duration / 1000) / 1_000_000;

    console.log(`Download throughput: ${mbps.toFixed(2)} Mbps`);
    expect(mbps).toBeGreaterThan(100); // Localhost should be fast
  });

  test('Upload throughput should exceed 100 Mbps on localhost', async ({ request }) => {
    const uploadData = Buffer.alloc(50 * 1024 * 1024); // 50MB

    const startTime = Date.now();
    const response = await request.post('http://localhost:8888/api/upload', {
      data: uploadData,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    const duration = Date.now() - startTime;

    const mbps = (uploadData.length * 8) / (duration / 1000) / 1_000_000;

    console.log(`Upload throughput: ${mbps.toFixed(2)} Mbps`);
    expect(mbps).toBeGreaterThan(100);
  });
});
```

### 4.4 Network Simulation

**Tool**: tc (Traffic Control) for Linux

```bash
# tests/scripts/simulate-network.sh (NEW)
#!/bin/bash

# Simulate MPLS-like conditions (low latency, high bandwidth)
simulate_mpls() {
  sudo tc qdisc add dev lo root netem delay 25ms 5ms loss 0.01%
}

# Simulate Internet-like conditions
simulate_internet() {
  sudo tc qdisc add dev lo root netem delay 100ms 50ms loss 0.5%
}

# Simulate poor network
simulate_poor() {
  sudo tc qdisc add dev lo root netem delay 250ms 100ms loss 2% corrupt 0.1%
}

# Clear network simulation
clear_simulation() {
  sudo tc qdisc del dev lo root 2>/dev/null || true
}

case "$1" in
  mpls) simulate_mpls ;;
  internet) simulate_internet ;;
  poor) simulate_poor ;;
  clear) clear_simulation ;;
  *) echo "Usage: $0 {mpls|internet|poor|clear}" ;;
esac
```

**Integration with Playwright**:

```javascript
// tests/e2e/network-conditions.spec.js (NEW)
const { execSync } = require('child_process');

test.describe('Network Condition Testing', () => {
  test.beforeEach(async () => {
    execSync('bash tests/scripts/simulate-network.sh clear');
  });

  test.afterEach(async () => {
    execSync('bash tests/scripts/simulate-network.sh clear');
  });

  test('should handle high latency conditions', async ({ request }) => {
    execSync('bash tests/scripts/simulate-network.sh internet');

    const response = await request.get('http://localhost:8888/api/latency', {
      params: { count: 10 },
      timeout: 30000
    });

    const result = await response.json();
    expect(result.avgLatency).toBeGreaterThan(80); // Should reflect simulated latency
  });
});
```

### 4.5 Load Testing

**Tool**: k6 or Artillery

```javascript
// tests/load/download-load.js (NEW - k6 script)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20, // 20 virtual users
  duration: '60s',
};

export default function () {
  const response = http.get('http://localhost:8888/api/download?duration=5');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'has transport header': (r) => r.headers['X-Transport-Type'] !== undefined,
    'is gold transport': (r) => r.headers['X-Transport-Type'] === 'gold',
  });

  sleep(1);
}
```

Run with: `k6 run tests/load/download-load.js`

---

## 5. Execution Roadmap

### Phase 1: Immediate Stabilization (Day 1-2)

**Goal**: Achieve 100% passing tests

| Task | Owner | Status | Priority |
|------|-------|--------|----------|
| Fix API path mismatches in test files | QA | 🔴 Todo | P0 |
| Implement `/api/test/info` endpoint OR update tests | Dev | 🔴 Todo | P0 |
| Fix WebSocket transport identification | Dev | 🔴 Todo | P0 |
| Run full test suite and verify all pass | QA | 🔴 Todo | P0 |
| Document actual API contract | Dev | 🔴 Todo | P1 |

**Success Criteria**:
- All 52 existing tests pass
- CI/CD pipeline runs tests on every commit
- Test reports generated and stored

**Blockers**:
- Need decision: Fix tests OR implement missing endpoints?

### Phase 2: Coverage Enhancement (Week 1)

**Goal**: Expand test coverage to 80%+

| Task | Estimated Effort | Priority |
|------|------------------|----------|
| Add error handling tests (15 test cases) | 4 hours | P1 |
| Add streaming validation tests (5 test cases) | 3 hours | P1 |
| Add transport comparison tests (8 test cases) | 2 hours | P2 |
| Add unit tests for middleware (20 test cases) | 6 hours | P2 |
| Add unit tests for route handlers (30 test cases) | 8 hours | P2 |
| Add rate limiting validation tests (10 test cases) | 3 hours | P2 |
| Document test patterns and best practices | 2 hours | P1 |

**Success Criteria**:
- Unit test coverage > 70%
- E2E test coverage of all critical paths
- All error conditions tested

**Deliverables**:
- 88 new test cases
- Test documentation
- Coverage report

### Phase 3: Advanced Testing (Week 2)

**Goal**: Test complex scenarios and edge cases

| Task | Estimated Effort | Priority |
|------|------------------|----------|
| Implement test mode orchestration tests (12 test cases) | 6 hours | P1 |
| Add MTU detection tests (8 test cases) | 4 hours | P2 |
| Add diagnostics tests (traceroute, MTR) (10 test cases) | 5 hours | P3 |
| Network condition simulation tests (15 test cases) | 8 hours | P2 |
| Security testing (injection, overflow) (10 test cases) | 4 hours | P2 |
| Cross-browser testing (Firefox, Safari) | 3 hours | P3 |

**Success Criteria**:
- All test modes (Basic, Detailed, Ludacris) fully tested
- Network simulation working
- Security vulnerabilities identified and tested

**Deliverables**:
- 55 new test cases
- Network simulation scripts
- Security test report

### Phase 4: Performance & Stability (Week 3-4)

**Goal**: Validate performance and long-term stability

| Task | Estimated Effort | Priority |
|------|------------------|----------|
| Performance benchmarking tests (20 test cases) | 8 hours | P1 |
| Load testing with k6/Artillery | 6 hours | P2 |
| Stress testing (concurrent users) | 4 hours | P2 |
| Endurance testing (24-hour run) | 2 hours + monitoring | P3 |
| Memory leak detection | 4 hours | P2 |
| Test flakiness analysis and fixes | 6 hours | P1 |

**Success Criteria**:
- Performance benchmarks documented
- Load test shows system handles 50 concurrent users
- No memory leaks detected
- Test flakiness < 1%

**Deliverables**:
- Performance baseline report
- Load test results
- Stability test report

---

## 6. Reporting Framework

### 6.1 Test Execution Reports

**Playwright HTML Reporter** (Already configured)
- Location: `playwright-report/index.html`
- Generated after each test run
- Includes screenshots and traces for failures

**JUnit XML Report** (Recommended addition)
```javascript
// playwright.config.js
reporter: [
  ['html'],
  ['junit', { outputFile: 'test-results/junit.xml' }],
  ['json', { outputFile: 'test-results/results.json' }]
],
```

### 6.2 Issue Documentation Template

```markdown
## Issue: [Brief Description]

**Severity**: Critical | High | Medium | Low
**Component**: Download | Upload | Latency | WebSocket | UI | etc.
**Transport**: Gold | Silver | Both | N/A

### Reproduction Steps
1.
2.
3.

### Expected Behavior


### Actual Behavior


### Test Evidence
- Test file: `tests/e2e/xxx.spec.js:42`
- Screenshot: `test-results/screenshots/xxx.png`
- Trace: `test-results/traces/xxx.zip`

### Environment
- Server version:
- Node version:
- Browser:
- Network conditions:

### Root Cause Analysis


### Proposed Fix


### Verification Steps

```

### 6.3 Test Coverage Tracking

**Jest Coverage** (for unit tests):
```bash
npm test -- --coverage
```

Generates:
- Terminal summary
- `coverage/lcov-report/index.html` (detailed HTML report)

**Target Coverage**:
- Unit tests: > 70%
- Integration tests: > 60%
- E2E tests: All critical user paths

### 6.4 Metrics Dashboard

**Recommended**: Store test results in time-series database

Key metrics to track:
- Test pass rate over time
- Test execution duration
- Flaky test identification
- Code coverage trends
- Performance benchmarks (throughput, latency)

**Quick Dashboard with JSON Reports**:

```javascript
// scripts/generate-dashboard.js (NEW)
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results/results.json'));

const stats = {
  total: results.suites.reduce((sum, s) => sum + s.specs.length, 0),
  passed: results.suites.reduce((sum, s) =>
    sum + s.specs.filter(t => t.ok).length, 0),
  failed: results.suites.reduce((sum, s) =>
    sum + s.specs.filter(t => !t.ok).length, 0),
  duration: results.suites.reduce((sum, s) => sum + s.duration, 0),
};

console.log(`
Test Results Summary
===================
Total:    ${stats.total}
Passed:   ${stats.passed} (${(stats.passed/stats.total*100).toFixed(1)}%)
Failed:   ${stats.failed}
Duration: ${(stats.duration/1000).toFixed(1)}s
`);
```

### 6.5 Regression Testing Procedures

**Automated Regression Suite**:
- Run full test suite on every commit (CI/CD)
- Tag critical tests with `@smoke` for quick validation
- Run extended tests nightly

```javascript
// Run smoke tests only
npx playwright test --grep @smoke

// Run full suite
npx playwright test

// Run specific feature
npx playwright test tests/e2e/download
```

**Manual Regression Checklist** (for major releases):
- [ ] Test both ports (8888, 8889) manually
- [ ] Verify Gold/Silver transport indicators in UI
- [ ] Run Basic, Detailed, and Ludacris modes end-to-end
- [ ] Test with real SD-WAN policy (not localhost)
- [ ] Verify logs are properly formatted (JSON)
- [ ] Check Docker container health
- [ ] Validate diagnostics targets are restricted

---

## 7. Quick Start Guide

### 7.1 For Developers: Running Tests Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the application (Terminal 1)
npm start

# 3. Run all E2E tests (Terminal 2)
npm run test:e2e

# 4. Run tests in headed mode (see browser)
npm run test:e2e:headed

# 5. Run tests in UI mode (interactive)
npm run test:e2e:ui

# 6. View last test report
npm run test:e2e:report

# 7. Run unit tests with coverage
npm test -- --coverage

# 8. Run specific test file
npx playwright test tests/e2e/dual-port.spec.js

# 9. Run tests with debugging
PWDEBUG=1 npx playwright test
```

### 7.2 For QA Engineers: First-Time Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd speedtest

# 2. Install Node.js dependencies
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Set up environment (optional, uses defaults)
cp .env.example .env
nano .env  # Edit DATA_CENTER_ID if needed

# 5. Start Docker environment
docker-compose up -d

# 6. Verify services are running
curl http://localhost:8888/health
curl http://localhost:8889/health

# 7. Run smoke tests
npx playwright test --grep @smoke

# 8. Run full test suite
npm run test:e2e

# 9. Open test report
npm run test:e2e:report
```

### 7.3 Immediate Action Items

**PRIORITY 1: Fix Failing Tests**

```bash
# Option A: Update test files (Quick fix)
# Edit tests/e2e/performance-tests.spec.js
# Change all instances of:
#   /api/test/download → /api/download
#   /api/test/upload → /api/upload
#   /api/test/latency → /api/latency

# Then remove or comment out /api/test/info tests (lines 169-193)

# Option B: Implement missing endpoint (Proper fix)
# Create src/routes/testInfo.js (see section 3.2)
# Update src/server.js to add route
# Update WebSocket handler to include transport in messages
```

**PRIORITY 2: Run Fixed Tests**

```bash
npm run test:e2e 2>&1 | tee test-run.log
```

**PRIORITY 3: Document Results**

```bash
# Generate coverage report
npm test -- --coverage

# View Playwright report
npm run test:e2e:report

# Document any remaining failures in GitHub Issues
```

### 7.4 CI/CD Integration

**GitHub Actions Workflow** (Recommended):

```yaml
# .github/workflows/test.yml (NEW)
name: Playwright Tests

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start application
        run: npm start &
        env:
          NODE_ENV: test
          DATA_CENTER_ID: CI-GITHUB

      - name: Wait for server
        run: npx wait-on http://localhost:8888/health http://localhost:8889/health

      - name: Run Playwright tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test traces
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

---

## 8. Appendices

### A. Test Tagging Strategy

```javascript
// Use tags to categorize tests
test.describe('Download Tests @smoke @performance @gold', () => {
  // ...
});

test.describe('Diagnostics Tests @slow @ludacris @security', () => {
  // ...
});

// Run specific tags:
// npx playwright test --grep @smoke
// npx playwright test --grep @performance
// npx playwright test --grep "@gold|@silver"  # Both transports
```

### B. Common Test Patterns

```javascript
// Pattern 1: Test on both ports
async function testBothPorts(testFn) {
  await testFn('http://localhost:8888', 'gold', 8888);
  await testFn('http://localhost:8889', 'silver', 8889);
}

// Pattern 2: Measure performance
async function measurePerformance(operation) {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration };
}

// Pattern 3: Retry with backoff (for flaky operations)
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### C. Troubleshooting Guide

**Problem**: Tests fail with "connect ECONNREFUSED"
- **Cause**: Server not running
- **Fix**: Run `npm start` or `docker-compose up`

**Problem**: Tests timeout
- **Cause**: Server overloaded or network latency
- **Fix**: Increase timeout in playwright.config.js or reduce concurrent tests

**Problem**: WebSocket tests fail
- **Cause**: WebSocket upgrade not working or port blocked
- **Fix**: Check firewall, verify `/ws/latency` endpoint

**Problem**: Rate limiting tests flaky
- **Cause**: Rate limit state shared between test runs
- **Fix**: Add delay between tests or reset rate limit state

**Problem**: Tests pass locally but fail in CI
- **Cause**: Timing differences, resource constraints
- **Fix**: Increase timeouts in CI, use `retrties: 2`

### D. References

- [Playwright Documentation](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
- [Express.js Testing Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [WebSocket Testing](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Network Simulation with tc](https://man7.org/linux/man-pages/man8/tc-netem.8.html)
- [k6 Load Testing](https://k6.io/docs/)

---

## Document Control

**Version**: 1.0
**Date**: 2026-02-11
**Author**: QA Team
**Status**: Draft
**Next Review**: After Phase 1 completion

**Change Log**:
- 2026-02-11: Initial test plan created based on codebase analysis
