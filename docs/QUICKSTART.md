# SD-WAN Speed Test Server - Quick Start Guide

## You've Got Everything You Need!

The application is **complete** with both backend and frontend ready to deploy. Here's how to get it running.

---

## Option 1: Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Ports 8888 and 8889 available

### Steps

```bash
cd sdwan-speedtest

# 1. Copy environment configuration
cp .env.example .env

# 2. Edit configuration (optional - defaults work fine)
nano .env
# Set DATA_CENTER_ID to identify your location (e.g., DC1-SJC, DC2-NYC)

# 3. Build and start the container
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

### Access the Application

Open your browser to:
- **Gold Transport:** http://your-server-ip:8888
- **Silver Transport:** http://your-server-ip:8889

---

## Option 2: Direct Node.js (Development)

### Prerequisites
- Node.js 18 or higher
- npm

### Steps

```bash
cd sdwan-speedtest

# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Edit configuration
nano .env

# 4. Start the server
npm start

# For development with auto-reload:
npm run dev
```

### Access the Application

Open your browser to:
- http://localhost:8888 (Gold Transport)
- http://localhost:8889 (Silver Transport)

---

## Verification Steps

### 1. Check Server Health

```bash
# Gold transport
curl http://localhost:8888/health

# Silver transport  
curl http://localhost:8889/health
```

You should see JSON output with status, uptime, and memory usage.

### 2. Test Backend APIs

```bash
# Latency test
curl http://localhost:8888/api/latency/ping

# Download test (5 seconds)
curl http://localhost:8888/api/download/single?duration=5 > /dev/null

# Upload test
dd if=/dev/urandom bs=1M count=10 | curl -X POST \
  http://localhost:8888/api/upload \
  --data-binary @- \
  -H "Content-Type: application/octet-stream"
```

### 3. Access the Web UI

1. Open http://localhost:8888 in your browser
2. You should see the SD-WAN Speed Test interface
3. Select a transport (Gold/Silver/Both)
4. Choose a test mode (Basic/Detailed/Ludacris)
5. Click "START TEST"

---

## SD-WAN Integration

### Configure Centralized Policy

For this tool to work properly in an SD-WAN environment, you need to configure your centralized policy to steer traffic based on **destination TCP port**.

#### Example: Cisco SD-WAN (Viptela)

```
# Application-aware routing policy
match
  destination-port 8888
action
  sla-class Gold
  preferred-color mpls
  
match
  destination-port 8889
action  
  sla-class Silver
  preferred-color biz-internet
```

#### Key Points
- The application **does not set DSCP** (browsers can't)
- SD-WAN policy **must match on destination port**
- Gold = Port 8888
- Silver = Port 8889

---

## Architecture Overview

```
Branch Site                      Data Center
┌─────────────┐                 ┌──────────────┐
│   Browser   │                 │              │
│             │  Gold (8888)    │   Docker     │
│  User opens ├────────────────>│  Container   │
│  :8888      │  SD-WAN Tunnel  │              │
│             │                 │  Gold: 8888  │
│             │                 │  Silver: 8889│
│             │  Silver (8889)  │              │
│  User opens ├────────────────>│              │
│  :8889      │  SD-WAN Tunnel  │              │
└─────────────┘                 └──────────────┘
```

---

## Troubleshooting

### Container won't start

```bash
# Check if ports are in use
sudo netstat -tulpn | grep 888

# Check Docker logs
docker-compose logs

# Rebuild container
docker-compose down
docker-compose up --build
```

### Both transports show same performance

This means SD-WAN policy is NOT steering based on port:
1. Verify centralized policy configuration
2. Check App-Aware Routing (AAR) is enabled
3. Confirm SLA classes are configured
4. Verify transport color preferences

### "Cannot connect to server"

1. Check firewall rules allow ports 8888 and 8889
2. Verify container is running: `docker-compose ps`
3. Check logs: `docker-compose logs -f`
4. Ensure network allows browser to reach server

### Tests fail or timeout

1. Check rate limiting in .env (may need to increase)
2. Verify sufficient container resources
3. Check network connectivity
4. Review browser console for errors (F12)

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATA_CENTER_ID | DC1-UNKNOWN | Identifier for this server |
| GOLD_PORT | 8888 | Port for Gold transport |
| SILVER_PORT | 8889 | Port for Silver transport |
| MAX_CONCURRENT_TESTS | 20 | Max simultaneous tests |
| MAX_UPLOAD_SIZE | 262144000 | Max upload size (250MB) |
| ENABLE_DIAGNOSTICS | false | Enable Ludacris mode diagnostics |
| APPROVED_TARGETS | 8.8.8.8,1.1.1.1 | Targets for traceroute/MTR |

### Resource Limits (docker-compose.yml)

Default limits:
- **CPU:** 4 vCPU max, 2 vCPU reserved
- **Memory:** 4GB max, 2GB reserved

Adjust in docker-compose.yml under `deploy.resources`

---

## Next Steps After Deployment

1. **Test from a branch site** via SD-WAN
2. **Verify transport steering** works correctly
3. **Run comparison tests** (Gold vs Silver)
4. **Document your findings**
5. **Share results** with your network team

---

## Support & Issues

- Check logs first: `docker-compose logs -f`
- Review configuration: `cat .env`
- Test backend APIs directly (see verification steps)
- Check browser console for frontend errors

The application is designed to be self-explanatory and provide helpful error messages.

---

## What You've Built

✅ **Dual-port server** (Gold 8888, Silver 8889)  
✅ **Three test modes** (Basic, Detailed, Ludacris)  
✅ **Full web UI** with drag-and-drop uploads  
✅ **Real-time metrics** during testing  
✅ **Results visualization** with warnings  
✅ **Docker deployment** ready  
✅ **Security hardened** (rate limiting, input validation)  
✅ **Production ready** (structured logging, health checks)  

**Enjoy your SD-WAN speed test server!** 🚀
