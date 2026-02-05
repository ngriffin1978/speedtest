# SD-WAN Speed Test Server - Resource Footprint Estimate

## Container Resource Requirements

### Minimal Deployment (Low Concurrency)
**Scenario:** 1-5 concurrent tests, Basic mode only

- **CPU:** 1-2 vCPUs
- **RAM:** 512 MB - 1 GB
- **Disk:** 500 MB (container image + minimal temp storage)
- **Network:** 1 Gbps NIC (can saturate)

**Use case:** Small branch deployment, dev/test environment

---

### Recommended Production (Moderate Concurrency)
**Scenario:** 10-20 concurrent tests, all modes

- **CPU:** 2-4 vCPUs
- **RAM:** 2-4 GB
- **Disk:** 1 GB (container image + temp file buffer)
- **Network:** 1-10 Gbps NIC

**Use case:** Enterprise data center, supporting multiple branches

---

### High Performance (High Concurrency)
**Scenario:** 50+ concurrent tests, Ludacris mode enabled

- **CPU:** 4-8 vCPUs
- **RAM:** 4-8 GB
- **Disk:** 2 GB
- **Network:** 10+ Gbps NIC (can approach line rate)

**Use case:** Large enterprise, regional hub, load testing scenarios

---

## Resource Breakdown by Component

### CPU Utilization
| Component | CPU Usage | Notes |
|-----------|-----------|-------|
| Web Server (static files) | ~5-10% per vCPU | Minimal, mostly idle |
| Download test endpoint | ~15-30% per vCPU | Generating/streaming data |
| Upload test endpoint | ~10-20% per vCPU | Receiving and discarding data |
| Latency/ping endpoints | ~1-5% per vCPU | Very lightweight |
| Diagnostics (traceroute/MTR) | ~20-40% per vCPU | Spawns external processes |

**Peak CPU:** During Ludacris mode with 8 parallel streams + diagnostics running

### Memory Utilization
| Component | RAM Usage | Notes |
|-----------|-----------|-------|
| Base container runtime | ~100-200 MB | Node.js/Python + dependencies |
| Per-test session buffer | ~10-50 MB | Depends on chunk size, streaming |
| File upload buffer (250 MB max) | ~250 MB | Per concurrent upload test |
| WebSocket connections | ~1-5 MB | Per active connection |
| Diagnostics tools | ~10-50 MB | Traceroute, MTR processes |

**Peak Memory:** 20 concurrent upload tests × 250 MB = ~5 GB (worst case)

### Disk I/O
| Component | Disk Usage | Notes |
|-----------|------------|-------|
| Container image | ~200-400 MB | Slim base image + app code |
| Temp file storage | 0-250 MB | Per upload test, deleted immediately |
| Logs (stdout/JSON) | ~1-10 MB/day | Structured logging, rotated |

**Important:** Files are streamed to `/dev/null` or memory, not written to disk in production

### Network Bandwidth
| Test Type | Bandwidth per Test | Notes |
|-----------|-------------------|-------|
| Download (single stream) | Up to 1 Gbps | Limited by client or path |
| Download (8 streams) | Up to 10 Gbps | Can saturate 10G NIC |
| Upload | Up to 1 Gbps | Typically lower than download |
| Latency tests | < 1 Mbps | Negligible |

**Peak Network:** Multiple Ludacris mode tests running simultaneously

---

## Scaling Considerations

### Vertical Scaling (Single Container)
- **CPU bottleneck:** ~50 concurrent tests on 8 vCPUs
- **Memory bottleneck:** ~20 concurrent 250MB uploads on 8GB RAM
- **Network bottleneck:** 10 Gbps NIC saturates at ~10-15 Ludacris mode tests

### Horizontal Scaling (Future v2)
- Deploy multiple containers across data centers
- Load balance across instances
- Each instance handles its own region/subnet

---

## Resource Optimization Strategies

### 1. **Streaming Architecture** (Already Planned)
- Stream upload data to `/dev/null` - no disk writes
- Generate download data on-the-fly - no pre-computed files
- Use chunked encoding - no full buffering

### 2. **Rate Limiting** (Security + Resource Protection)
- Limit concurrent tests per IP: 2-3 simultaneous
- Max test duration enforcement: 10 minutes hard stop
- Request queue with overflow rejection

### 3. **Efficient Test Modes**
- Basic mode: Minimal footprint, quick completion
- Detailed mode: Moderate resources, acceptable for most
- Ludacris mode: High resources, require authentication (future)

### 4. **Memory-Efficient Upload Handling**
```
Good: Stream directly to throughput calculator → discard
Bad:  Buffer entire 250MB file → calculate → discard
```

### 5. **Diagnostics Throttling**
- Limit concurrent traceroute/MTR processes: 5 max
- Cache recent diagnostic results: 5-minute TTL
- Whitelist approved targets only

---

## Example Deployment Specs

### Small Enterprise (1-10 branches)
```yaml
Container Resources:
  cpu: 2
  memory: 2Gi
  disk: 1Gi
  
Expected Load:
  - Peak concurrent tests: 5-10
  - Average throughput: 2-5 Gbps
  - 99th percentile test completion: < 5 minutes
```

### Medium Enterprise (50-100 branches)
```yaml
Container Resources:
  cpu: 4
  memory: 4Gi
  disk: 2Gi
  
Expected Load:
  - Peak concurrent tests: 20-30
  - Average throughput: 5-10 Gbps
  - 99th percentile test completion: < 5 minutes
```

### Large Enterprise (500+ branches)
```yaml
Container Resources:
  cpu: 8
  memory: 8Gi
  disk: 2Gi
  
Expected Load:
  - Peak concurrent tests: 50+
  - Average throughput: 10+ Gbps
  - Consider multiple instances
```

---

## Monitoring Recommendations

Track these metrics to right-size resources:

- **CPU usage:** Alert if sustained > 80%
- **Memory usage:** Alert if sustained > 85%
- **Active connections:** Track concurrent test count
- **Network throughput:** Monitor inbound/outbound
- **Test queue depth:** Alert if tests are waiting

---

## Cost Estimate (Cloud Hosting)

### AWS Example Pricing
| Instance Type | vCPUs | RAM | Network | Monthly Cost* |
|--------------|-------|-----|---------|--------------|
| t3.medium | 2 | 4 GB | Up to 5 Gbps | ~$30 |
| c6i.xlarge | 4 | 8 GB | Up to 12.5 Gbps | ~$120 |
| c6i.2xlarge | 8 | 16 GB | Up to 12.5 Gbps | ~$240 |

*Approximate, excludes data transfer costs

### On-Premises / Data Center
- **VM overhead:** Minimal (single container)
- **Licensing:** None (open source stack)
- **Network:** Use existing DC infrastructure

---

## Summary

**Minimum viable:** 1-2 vCPUs, 1 GB RAM, 500 MB disk  
**Recommended production:** 2-4 vCPUs, 2-4 GB RAM, 1 GB disk  
**High performance:** 4-8 vCPUs, 4-8 GB RAM, 2 GB disk  

**Key insight:** Network bandwidth is typically the bottleneck, not CPU/RAM. A modest 2 vCPU / 2GB container can handle most enterprise workloads if properly rate-limited.
