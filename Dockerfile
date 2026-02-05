# SD-WAN Speed Test Server Dockerfile
# Multi-stage build for optimized image size

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

# Install diagnostic tools needed for Ludacris mode
RUN apk add --no-cache \
    iputils \
    bind-tools \
    mtr \
    tcptraceroute \
    curl

# Create non-root user for security
RUN addgroup -g 1001 -S speedtest && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G speedtest -g speedtest speedtest

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=speedtest:speedtest . .

# Create temp directory for file uploads (with proper permissions)
RUN mkdir -p /tmp/speedtest-uploads && \
    chown -R speedtest:speedtest /tmp/speedtest-uploads && \
    chmod 700 /tmp/speedtest-uploads

# Switch to non-root user
USER speedtest

# Expose both Gold (8888) and Silver (8889) transport ports
EXPOSE 8888 8889

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8888/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
