# SD-WAN Speed Test Server - Task Breakdown (v1)

## Phase 1: Foundation & Infrastructure
### 1.1 Docker Container Setup
- [ ] Create Dockerfile with appropriate base image (Node.js or Python)
- [ ] Configure dual-port binding (8888 for Gold, 8889 for Silver)
- [ ] Set up container health checks
- [ ] Create docker-compose.yml for easy deployment
- [ ] Add environment variable configuration

### 1.2 Project Structure
- [ ] Initialize project directory structure
- [ ] Set up static file serving (HTML/CSS/JS)
- [ ] Create API route structure
- [ ] Add logging configuration (JSON structured logs)
- [ ] Create configuration file for approved diagnostic targets

---

## Phase 2: Backend API Service
### 2.1 Core Server Framework
- [ ] Implement HTTP server with dual-port listeners
- [ ] Add port detection middleware (infer Gold/Silver transport)
- [ ] Set up WebSocket support for real-time tests
- [ ] Implement rate limiting per client IP
- [ ] Add request validation and error handling

### 2.2 Download Test Endpoints
- [ ] Create single-stream download endpoint (chunked data)
- [ ] Create multi-stream download endpoint
- [ ] Implement configurable payload generation
- [ ] Add throughput measurement and reporting
- [ ] Implement max duration enforcement

### 2.3 Upload Test Endpoints
- [ ] Create upload receiver endpoint (POST)
- [ ] Add support for chunked upload measurement
- [ ] Implement drag-and-drop file upload handler
- [ ] Add throughput calculation during upload
- [ ] Enforce upload size limits

### 2.4 Latency & Diagnostics
- [ ] Create ping/echo endpoint (WebSocket or HTTP)
- [ ] Implement jitter measurement
- [ ] Create idle latency test endpoint
- [ ] Create loaded latency test endpoint
- [ ] Add packet timing statistics

### 2.5 Advanced Diagnostics (Ludacris Mode)
- [ ] Implement server-side traceroute wrapper
- [ ] Add MTR-style path analysis
- [ ] Create approved target whitelist validation
- [ ] Implement MTU detection helpers
- [ ] Add sustained throughput soak test endpoint

### 2.6 Result Logging
- [ ] Design JSON result schema
- [ ] Implement structured logging to stdout
- [ ] Add optional file-based result storage
- [ ] Include all required metadata (timestamp, transport, port, etc.)
- [ ] Add warning/flag detection logic

---

## Phase 3: Frontend Web UI
### 3.1 HTML Structure
- [ ] Create main index.html layout
- [ ] Add transport selector (Gold/Silver/Both)
- [ ] Add test mode selector (Basic/Detailed/Ludacris)
- [ ] Create results display sections
- [ ] Add expandable detailed metrics sections

### 3.2 CSS Styling
- [ ] Design engineer-friendly UI (clean, functional)
- [ ] Create responsive layout
- [ ] Style progress indicators
- [ ] Design metric cards/sections
- [ ] Add warning/alert styling

### 3.3 JavaScript Test Orchestration
- [ ] Implement test mode workflows (Basic/Detailed/Ludacris)
- [ ] Create transport selection logic
- [ ] Implement "Both" mode (sequential Gold→Silver testing)
- [ ] Add test phase sequencing
- [ ] Create abort/cancel functionality

### 3.4 Download Test Client
- [ ] Implement single-stream fetch-based download
- [ ] Implement multi-stream parallel downloads
- [ ] Add real-time throughput calculation
- [ ] Display progress and live metrics
- [ ] Handle errors and timeouts

### 3.5 Upload Test Client
- [ ] Implement drag-and-drop file upload UI
- [ ] Create synthetic upload data generator
- [ ] Add upload progress tracking
- [ ] Calculate and display upload throughput
- [ ] Handle large file chunking

### 3.6 Latency Test Client
- [ ] Implement WebSocket ping/pong for latency
- [ ] Calculate idle latency statistics
- [ ] Implement loaded latency measurement
- [ ] Display jitter metrics
- [ ] Create latency histogram/distribution

### 3.7 Results Display
- [ ] Show live test progress
- [ ] Display summary metrics clearly
- [ ] Create expandable detailed sections
- [ ] Add comparison view for "Both" mode
- [ ] Implement copy/export results functionality

### 3.8 Diagnostics UI (Ludacris Mode)
- [ ] Add path analysis display
- [ ] Show MTU detection results
- [ ] Display sustained throughput graphs
- [ ] Add warning indicators
- [ ] Create detailed logs section

---

## Phase 4: Test Mode Implementation
### 4.1 Basic Mode (30-60 seconds)
- [ ] Single-stream download test
- [ ] Multi-stream download test
- [ ] Short upload test
- [ ] Idle latency measurement
- [ ] Basic result summary

### 4.2 Detailed Mode (2-4 minutes)
- [ ] All Basic mode tests
- [ ] Packet loss estimation
- [ ] Loaded latency (bufferbloat) detection
- [ ] TCP ramp-up analysis
- [ ] Parallel stream testing (1/4/8 streams)
- [ ] Throughput stability analysis

### 4.3 Ludacris Mode (5-10+ minutes)
- [ ] All Detailed mode tests
- [ ] Sustained throughput soak tests
- [ ] MTU/PMTUD symptom detection
- [ ] Server-side path analysis (traceroute/MTR)
- [ ] Automatic Gold vs Silver A/B comparison
- [ ] Extended stability testing

---

## Phase 5: Data & Metrics
### 5.1 Metric Collection
- [ ] Throughput over time (time series)
- [ ] Latency (idle vs loaded)
- [ ] Jitter distribution calculation
- [ ] Loss indicators
- [ ] Stability and variance metrics

### 5.2 Analysis & Warnings
- [ ] Detect high bufferbloat
- [ ] Flag unstable throughput
- [ ] Identify packet loss patterns
- [ ] Detect MTU issues
- [ ] Flag policy mismatches (unexpected port behavior)

### 5.3 Result Schema
- [ ] Test mode field
- [ ] Selected transport field
- [ ] Destination TCP port
- [ ] Data center identifier
- [ ] Timestamp (ISO 8601)
- [ ] Per-phase metrics object
- [ ] Warnings/flags array

---

## Phase 6: Security & Safety
### 6.1 Security Controls
- [ ] Implement per-client rate limiting
- [ ] Add maximum test duration enforcement
- [ ] Create approved diagnostic target whitelist
- [ ] Add input validation on all endpoints
- [ ] Implement request size limits

### 6.2 Resource Protection
- [ ] Add concurrency limits per client
- [ ] Implement memory limits for tests
- [ ] Add timeout enforcement
- [ ] Prevent abuse as traffic generator
- [ ] Add container resource constraints

---

## Phase 7: Testing & Validation
### 7.1 Unit Testing
- [ ] Test download endpoint accuracy
- [ ] Test upload endpoint accuracy
- [ ] Test latency measurement precision
- [ ] Test rate limiting behavior
- [ ] Test timeout enforcement

### 7.2 Integration Testing
- [ ] Test full Basic mode workflow
- [ ] Test full Detailed mode workflow
- [ ] Test full Ludacris mode workflow
- [ ] Test "Both" mode (Gold + Silver)
- [ ] Test port-based transport inference

### 7.3 SD-WAN Environment Testing
- [ ] Verify Gold transport (port 8888) behavior
- [ ] Verify Silver transport (port 8889) behavior
- [ ] Test with actual SD-WAN policy steering
- [ ] Validate results match network reality
- [ ] Test across different branch sites

---

## Phase 8: Documentation & Deployment
### 8.1 Documentation
- [ ] README.md with deployment instructions
- [ ] API endpoint documentation
- [ ] SD-WAN policy configuration examples
- [ ] Troubleshooting guide
- [ ] Result interpretation guide

### 8.2 Deployment Artifacts
- [ ] Finalize Dockerfile
- [ ] Create deployment guide
- [ ] Add configuration examples
- [ ] Create quick-start guide
- [ ] Add architecture diagram

### 8.3 Operational Readiness
- [ ] Add health check endpoint
- [ ] Implement graceful shutdown
- [ ] Add structured logging
- [ ] Create monitoring recommendations
- [ ] Document resource requirements

---

## Phase 9: Future-Proofing for v2
### 9.1 Architecture Considerations
- [ ] Keep components loosely coupled
- [ ] Design API for distributed deployment
- [ ] Avoid hardcoded single-DC assumptions
- [ ] Use data center identifier consistently
- [ ] Document extension points

---

## Dependencies & Order
**Critical Path:**
1. Phase 1 (Foundation) → Phase 2.1-2.3 (Core Backend) → Phase 3.1-3.4 (Basic UI)
2. Phase 4.1 (Basic Mode) → End-to-end testing
3. Phase 2.4 + Phase 3.6 → Phase 4.2 (Detailed Mode)
4. Phase 2.5 + Phase 3.8 → Phase 4.3 (Ludacris Mode)
5. Phase 6 (Security) should be integrated throughout
6. Phase 7 (Testing) runs parallel to development
7. Phase 8 (Documentation) runs throughout

**Minimal Viable Product (MVP):**
- Phase 1 (complete)
- Phase 2.1, 2.2, 2.3, 2.4 (core tests)
- Phase 3.1-3.7 (UI)
- Phase 4.1 (Basic mode)
- Phase 6.1 (basic security)
- Phase 8 (minimal docs)

---

## Estimated Effort
- **MVP (Basic Mode only):** 2-3 days
- **Full v1 (all modes):** 5-7 days
- **Production-ready with testing:** 7-10 days

---

## Next Steps
1. Set up development environment
2. Create initial Docker container
3. Build basic server with dual-port support
4. Implement simple download test
5. Create minimal UI
6. Iterate and expand
