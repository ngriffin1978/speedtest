#!/usr/bin/env node

/**
 * SD-WAN Speed Test Server
 * Main entry point - starts dual-port listeners for Gold (8888) and Silver (8889) transports
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const config = require('./config/config');
const logger = require('./utils/logger');
const portDetectionMiddleware = require('./middleware/portDetection');
const rateLimitMiddleware = require('./middleware/rateLimit');

// Import routes
const downloadRoutes = require('./routes/download');
const uploadRoutes = require('./routes/upload');
const latencyRoutes = require('./routes/latency');
const diagnosticsRoutes = require('./routes/diagnostics');
const healthRoutes = require('./routes/health');

/**
 * Create and configure Express app
 */
function createApp() {
    const app = express();

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'", "ws:", "wss:"]
            }
        }
    }));

    // Compression
    app.use(compression());

    // Body parsing
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Port detection middleware (sets req.transport based on port)
    app.use(portDetectionMiddleware);

    // Rate limiting
    app.use(rateLimitMiddleware);

    // Static files
    app.use(express.static(path.join(__dirname, '../public')));

    // API Routes
    app.use('/api/download', downloadRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/latency', latencyRoutes);
    app.use('/api/diagnostics', diagnosticsRoutes);
    app.use('/health', healthRoutes);

    // Root endpoint - serve main UI
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            path: req.path
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        logger.error('Unhandled error:', err);
        res.status(err.status || 500).json({
            error: process.env.NODE_ENV === 'production' 
                ? 'Internal Server Error' 
                : err.message
        });
    });

    return app;
}

/**
 * Start server on specified port with WebSocket support
 */
function startServer(port, transportName) {
    const app = createApp();
    const server = createServer(app);
    
    // WebSocket server for latency testing
    const wss = new WebSocketServer({ 
        server,
        path: '/ws/latency'
    });

    wss.on('connection', (ws, req) => {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.socket.remoteAddress;
        
        logger.info(`WebSocket connection established from ${clientIp} on ${transportName}`);

        ws.on('message', (message) => {
            // Echo back for latency measurement
            ws.send(message);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error on ${transportName}:`, error);
        });

        ws.on('close', () => {
            logger.debug(`WebSocket connection closed from ${clientIp} on ${transportName}`);
        });
    });

    server.listen(port, '0.0.0.0', () => {
        logger.info(`${transportName} Transport Server listening on port ${port}`);
        logger.info(`Data Center: ${config.dataCenterId}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Max concurrent tests: ${config.maxConcurrentTests}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info(`SIGTERM received on ${transportName} server, shutting down gracefully...`);
        server.close(() => {
            logger.info(`${transportName} server closed`);
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.info(`SIGINT received on ${transportName} server, shutting down gracefully...`);
        server.close(() => {
            logger.info(`${transportName} server closed`);
            process.exit(0);
        });
    });

    return server;
}

/**
 * Main entry point
 */
function main() {
    logger.info('Starting SD-WAN Speed Test Server...');
    logger.info(`Node version: ${process.version}`);
    logger.info(`Platform: ${process.platform}`);

    // Start Gold transport (port 8888)
    const goldServer = startServer(config.goldPort, 'Gold');

    // Start Silver transport (port 8889)
    const silverServer = startServer(config.silverPort, 'Silver');

    logger.info('Both transport servers started successfully');
    logger.info(`Gold Transport: http://0.0.0.0:${config.goldPort}`);
    logger.info(`Silver Transport: http://0.0.0.0:${config.silverPort}`);
}

// Start the application
if (require.main === module) {
    main();
}

module.exports = { createApp, startServer };
