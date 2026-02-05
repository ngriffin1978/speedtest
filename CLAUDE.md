# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Docker Development
```bash
# Build and start containers
docker-compose up -d

# Build without cache
docker-compose build --no-cache

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Check container health
docker-compose ps
curl http://localhost:8888/health
curl http://localhost:8889/health
```

### Environment Setup
```bash
# Copy example environment file (if it exists)
cp .env.example .env

# Edit configuration
nano .env

# Required: Set DATA_CENTER_ID to identify your deployment
# Example: DC1-SJC, DC2-NYC, BRANCH-CHI
```

## High-Level Architecture

### Dual-Port Design Pattern
This application uses a **dual-port architecture** that is fundamental to its purpose:
- **Port 8888** → Gold Transport (premium path, typically MPLS)
- **Port 8889** → Silver Transport (backup path, typically internet)

**Why This Matters:** SD-WAN centralized policy steers traffic based on TCP destination port. When a client connects to port 8888, the SD-WAN fabric routes that traffic over the Gold transport. When connecting to 8889, traffic goes over Silver transport. This allows testing the actual performance of each transport path through encrypted SD-WAN tunnels.

**Implementation:** The server creates two separate HTTP servers (src/server.js) that share the same Express app instance. The `portDetectionMiddleware` (src/middleware/portDetection.js) detects which port received each request and sets `req.transport` to "gold" or "silver", which is then included in response headers and test results.

### Request Flow
```
Browser Client
    ↓
[Selects Transport: Gold/Silver/Both]
    ↓
Connects to Port 8888 (Gold) or 8889 (Silver)
    ↓
SD-WAN Policy Steers to Appropriate Transport
    ↓
Express Server (portDetectionMiddleware sets req.transport)
    ↓
Route Handler (download/upload/latency/diagnostics)
    ↓
Response with X-Transport-Type header
```

### Streaming Architecture
The application uses **streaming data generation** to minimize memory and disk footprint:

**Downloads:** Data is generated on-the-fly using `crypto.randomBytes()` and streamed directly to the client. No files are created or cached.

**Uploads:** Data sent by the client is consumed and immediately discarded. The server only tracks throughput metrics, never storing uploaded content.

**Benefits:** Server can handle multi-gigabit throughput tests without filling disk or exhausting memory. Resource usage remains constant regardless of test duration.

### Three-Tier Architecture
1. **Frontend (public/):** HTML5/CSS/JavaScript SPA with transport selector
2. **Express Server (src/server.js):** Dual HTTP servers with WebSocket support
3. **Test APIs (src/routes/):** Specialized endpoints for each test type

### WebSocket Latency Testing
Real-time latency measurements use WebSocket protocol (`/ws/latency`) for more accurate timing than HTTP polling. The WebSocket connection is established on either port 8888 or 8889, ensuring latency is measured through the correct transport path.

## Key Architectural Patterns

### Port Detection Middleware Pattern
Every request passes through `portDetectionMiddleware` which:
1. Checks `req.socket.localPort` to determine which port received the request
2. Sets `req.transport` to "gold", "silver", or "unknown"
3. Adds `X-Transport-Type` and `X-Data-Center` response headers

This ensures every response includes transport identification, critical for comparing Gold vs Silver performance.

### Rate Limiting Strategy (src/middleware/rateLimit.js)
Three-layer rate limiting approach:
1. **Global rate limiter:** Prevents server overload (default: 100 requests/minute per IP)
2. **Per-IP concurrent tests:** Max 3 simultaneous tests per IP address
3. **Total concurrent tests:** Max 20 tests across all clients (configurable via MAX_CONCURRENT_TESTS)

The `concurrentLimitMiddleware` tracks active tests and returns 429 status when limits are exceeded.

### Streaming Data Generation Pattern
See `src/routes/download.js` for the canonical example:
```javascript
// Generate chunks on-the-fly using setInterval
const interval = setInterval(() => {
    const chunk = crypto.randomBytes(chunkSize);
    res.write(chunk);
    bytesTransferred += chunk.length;

    if (elapsed >= duration) {
        clearInterval(interval);
        res.end();
    }
}, 10);
```

This pattern is used throughout the codebase for efficient streaming without file I/O.

### Security Model
- **Non-root execution:** Container runs as user `speedtest` (uid 1001)
- **Approved targets only:** Diagnostics (traceroute/MTR) restricted to pre-approved IP addresses
- **No data retention:** Uploaded files immediately discarded, never persisted
- **Input validation:** All user inputs validated with max duration, size, and concurrent limits
- **Read-only filesystem:** Container uses read-only root with tmpfs for /tmp

### Logging Pattern (src/utils/logger.js)
All logs output as **JSON to stdout** for container-friendly log aggregation:
```javascript
logger.info('message', { metadata });  // Structured logging
logger.logTestResult({ testType, transport, metrics });  // Test result logging
```

Never log to files in production. Docker/Kubernetes will capture stdout.

## Critical Concepts

### Why Dual Ports Matter
Traditional speed tests (Speedtest.net, Fast.com) measure internet performance. This tool measures **SD-WAN fabric performance** through encrypted tunnels. The SD-WAN centralized policy must be configured to steer based on destination port:

```
Example Viptela Policy:
match destination-port 8888 → Gold transport, prefer color mpls
match destination-port 8889 → Silver transport, prefer color biz-internet
```

Without proper SD-WAN policy configuration, both ports will use the same transport and show identical results.

### Transport Types
- **Gold:** Premium transport, typically MPLS with guaranteed SLA
- **Silver:** Backup transport, typically broadband internet
- **Both:** Run tests sequentially on Gold then Silver for A/B comparison

The UI allows selecting which transport(s) to test, and the frontend handles connecting to the appropriate port(s).

### Test Modes
- **Basic (30-60s):** Quick validation with single/multi-stream download, upload, idle latency
- **Detailed (2-4m):** Adds packet loss estimation, loaded latency (bufferbloat), TCP ramp-up, parallel stream testing
- **Ludacris (5-10m+):** Comprehensive testing with sustained throughput, MTU detection, traceroute/MTR, automatic Gold vs Silver comparison

Test orchestration is handled in `public/js/test-engine.js` which sequences API calls based on selected mode.

### No Data Persistence
The server **never persists test data**:
- Download tests: Generate random bytes on-the-fly
- Upload tests: Receive and immediately discard data
- Test results: Returned in response, not stored server-side

This design choice prioritizes minimal resource footprint over historical analysis. If you need historical data, implement optional result storage (database or time-series DB) as a separate feature.

## Configuration

### Key Environment Variables (src/config/config.js)
```bash
# Data Center Identification
DATA_CENTER_ID=DC1-SJC        # Identifies this server instance

# Ports (critical for SD-WAN policy)
GOLD_PORT=8888                 # Gold transport port
SILVER_PORT=8889               # Silver transport port

# Test Limits
MAX_CONCURRENT_TESTS=20        # Total concurrent tests across all clients
MAX_TEST_DURATION=600          # Maximum test duration in seconds
MAX_UPLOAD_SIZE=262144000      # Maximum upload size in bytes (250 MB)

# Rate Limiting
RATE_LIMIT_WINDOW=60000        # Rate limit window in milliseconds
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per IP per window
RATE_LIMIT_PER_IP_CONCURRENT=3 # Max concurrent tests per IP

# Diagnostics (Ludacris Mode)
ENABLE_DIAGNOSTICS=true        # Enable traceroute/MTR/MTU tests
APPROVED_TARGETS=8.8.8.8,1.1.1.1,10.0.0.1  # Comma-separated approved IPs
MAX_CONCURRENT_DIAGNOSTICS=5   # Max concurrent diagnostic operations
DIAGNOSTIC_TIMEOUT=30000       # Diagnostic command timeout in milliseconds

# Logging
LOG_LEVEL=info                 # Logging level (debug, info, warn, error)
NODE_ENV=production            # Environment (development, production)
```

### Critical Settings

**DATA_CENTER_ID:** Must be set to identify server location in test results. Use meaningful names like "DC1-SJC" or "BRANCH-CHI".

**Ports:** Must remain 8888/8889 unless SD-WAN policy is updated accordingly. Changing ports requires updating centralized policy on SD-WAN controllers.

**APPROVED_TARGETS:** Security boundary for diagnostic commands. Only IPs in this list can be used for traceroute/MTR. Include your data center, headquarters, and public DNS servers.

### Security Boundaries
1. **Rate limits** prevent abuse and resource exhaustion
2. **Concurrent test limits** prevent server overload
3. **Approved diagnostic targets** prevent using server as open network scanner
4. **Max upload size** prevents disk exhaustion attacks (though uploads are immediately discarded)
5. **Max test duration** prevents infinitely running tests
