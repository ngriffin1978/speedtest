# SD-WAN Network Speed Test Server

Docker-based network performance testing tool designed specifically for SD-WAN environments.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- SD-WAN fabric with centralized policy configured

### Deploy

```bash
# Clone the repository
git clone <repo-url>
cd sdwan-speedtest

# Copy environment configuration
cp .env.example .env

# Edit .env and set your DATA_CENTER_ID
nano .env

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

The server will start on:
- **Gold Transport:** http://your-server:8888
- **Silver Transport:** http://your-server:8889

### Test It

Open your browser and navigate to:
```
http://your-server:8888
```

## Architecture

### Dual-Port Operation
The application listens on two ports simultaneously:
- **Port 8888** → Gold Transport
- **Port 8889** → Silver Transport

Your SD-WAN centralized policy should steer traffic based on **destination TCP port**.

Example Viptela policy:
```
match destination-port 8888 → Gold transport, prefer color mpls
match destination-port 8889 → Silver transport, prefer color biz-internet
```

### How It Works

1. User accesses the web UI via browser
2. UI selects transport (Gold/Silver/Both)
3. Browser connects to appropriate port (8888 or 8889)
4. SD-WAN policy steers traffic to the configured transport
5. Tests run across encrypted SD-WAN tunnels
6. Results show actual SD-WAN fabric performance

## Test Modes

### Basic Mode (30-60 seconds)
- Download throughput (single + multi-stream)
- Upload throughput
- Idle latency and jitter
- Fast validation

### Detailed Mode (2-4 minutes)
- Everything in Basic, plus:
- Packet loss estimation
- Loaded latency (bufferbloat detection)
- TCP ramp-up analysis
- Parallel stream testing (1/4/8)
- Throughput stability analysis

### Ludacris Mode (5-10+ minutes)
- Everything in Detailed, plus:
- Sustained throughput soak tests
- MTU/PMTUD symptom detection
- Server-side path analysis (traceroute/MTR)
- Automatic Gold vs Silver A/B comparison

## API Endpoints

### Health
- `GET /health` - Health check

### Download Tests
- `GET /api/download/single?duration=20` - Single-stream download
- `GET /api/download/multi?streams=4` - Multi-stream download
- `GET /api/download/info` - Download test info

### Upload Tests
- `POST /api/upload` - Upload test (stream data in body)
- `GET /api/upload/info` - Upload test info

### Latency Tests
- `GET /api/latency/ping` - Simple ping
- `POST /api/latency/echo` - Echo with data
- `POST /api/latency/series` - Series of pings
- `WS /ws/latency` - WebSocket latency test

### Diagnostics (Ludacris Mode)
- `POST /api/diagnostics/traceroute` - Traceroute to target
- `POST /api/diagnostics/mtr` - MTR to target
- `POST /api/diagnostics/mtu` - MTU detection
- `GET /api/diagnostics/info` - Diagnostics info

## Configuration

Edit `.env` file or set environment variables:

```bash
# Data Center Identification
DATA_CENTER_ID=DC1-SJC

# Test Limits
MAX_CONCURRENT_TESTS=20
MAX_TEST_DURATION=600
MAX_UPLOAD_SIZE=262144000

# Diagnostics (Ludacris Mode)
ENABLE_DIAGNOSTICS=true
APPROVED_TARGETS=8.8.8.8,1.1.1.1,10.0.0.1
```

## Security

- Non-root container user
- Rate limiting per IP
- Concurrent test limits
- Approved diagnostic targets only
- Files immediately deleted after upload
- Read-only root filesystem
- No-new-privileges security option

## Resource Requirements

**Minimum:**
- 1-2 vCPUs
- 1 GB RAM
- 500 MB disk

**Recommended:**
- 2-4 vCPUs
- 2-4 GB RAM
- 1 GB disk
- 1-10 Gbps network

## Monitoring

Check container health:
```bash
docker-compose ps
curl http://localhost:8888/health
```

View logs:
```bash
docker-compose logs -f
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Troubleshooting

### Tests show same performance on both transports
- Verify SD-WAN policy is configured to steer based on destination port
- Check App-Aware Routing (AAR) policies
- Verify transport color preferences

### High latency or packet loss
- Check SD-WAN tunnel health
- Review WAN transport quality
- Verify no intermediate rate limiting

### Container won't start
- Check port availability: `netstat -ln | grep 888`
- Review logs: `docker-compose logs`
- Verify resource allocation

## License

MIT
