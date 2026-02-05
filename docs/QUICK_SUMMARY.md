# SD-WAN Network Speed Test Server
## 1-Minute Overview

### What It Is
A Docker-based network performance testing tool designed specifically for **SD-WAN environments**. It provides engineers with accurate, trustworthy measurements of network performance across encrypted SD-WAN tunnels between branch sites and data centers.

### The Problem It Solves
Traditional speed test tools (like Speedtest.net) measure public internet performance. This tool measures **SD-WAN fabric performance** - validating transport behavior, policy steering, and path quality inside your private network overlay.

### How It Works
**Simple:** Browser-based HTML5 interface - no agents to install, just visit the URL.

**Smart:** SD-WAN policy does the steering. The tool listens on two ports:
- **Port 8888** → Gold Transport (premium path)
- **Port 8889** → Silver Transport (standard path)

Your SD-WAN centralized policy steers traffic to different transport paths based on destination port.

### What It Tests
Three test modes for different scenarios:

**Basic Mode** (30-60 seconds)
- Download & upload throughput
- Latency and jitter
- Quick validation

**Detailed Mode** (2-4 minutes)
- Everything in Basic, plus:
- Packet loss detection
- Bufferbloat analysis
- Multi-stream testing (1/4/8 parallel streams)

**Ludacris Mode** (5-10+ minutes)
- Everything in Detailed, plus:
- Sustained throughput soak tests
- MTU/path analysis
- Automatic Gold vs Silver comparison

### Key Features
✓ **No client-side agents** - works in any browser  
✓ **Drag-and-drop file upload** testing (files deleted immediately)  
✓ **Transport comparison** - test Gold and Silver side-by-side  
✓ **Engineer-grade results** - real metrics, not vanity numbers  
✓ **Privacy-first** - no data retention, immediate file deletion  

### Deployment
Single Docker container, deployed in your data center. Branches connect via SD-WAN tunnels. Test traffic stays inside your encrypted fabric - never touches the public internet.

### Who It's For
Network engineers managing Cisco SD-WAN (Viptela) deployments who need to:
- Validate transport path selection
- Troubleshoot performance issues
- Verify SLA compliance
- Compare Gold vs Silver transport quality

---

**Bottom Line:** Trust your SD-WAN measurements. This isn't a public internet speed test - it's a tool built specifically to validate your SD-WAN fabric performance with engineer-grade accuracy.
