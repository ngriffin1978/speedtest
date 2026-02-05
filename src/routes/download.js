/**
 * Download Test Routes
 * Generates random data on-the-fly and streams to client
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');
const { testLimiter, concurrentLimitMiddleware } = require('../middleware/rateLimit');

// Apply rate limiting to download endpoints
router.use(testLimiter);
router.use(concurrentLimitMiddleware);

/**
 * Generate random data chunk
 */
function generateChunk(size = 65536) {
    return crypto.randomBytes(size);
}

/**
 * Single-stream download test
 * GET /api/download/single?duration=20&chunkSize=65536
 */
router.get('/single', (req, res) => {
    const duration = Math.min(parseInt(req.query.duration) || 20, 120); // max 120 seconds
    const chunkSize = Math.min(parseInt(req.query.chunkSize) || 65536, 1048576); // max 1MB chunks
    
    const startTime = Date.now();
    let bytesTransferred = 0;
    
    logger.info('Starting single-stream download test', {
        transport: req.transport,
        duration,
        chunkSize,
        clientIp: req.ip
    });
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Test-Type', 'download-single');
    
    // Stream data until duration expires
    const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (elapsed >= duration) {
            clearInterval(interval);
            res.end();
            
            logger.logTestResult({
                testType: 'download-single',
                transport: req.transport,
                duration: elapsed,
                bytesTransferred,
                throughputMbps: ((bytesTransferred * 8) / (elapsed * 1000000)).toFixed(2)
            });
            return;
        }
        
        const chunk = generateChunk(chunkSize);
        bytesTransferred += chunk.length;
        
        if (!res.write(chunk)) {
            // Backpressure - pause until drained
            res.once('drain', () => {
                // Resume on next tick
            });
        }
    }, 10); // Send chunks every 10ms
    
    // Handle client disconnect
    req.on('close', () => {
        clearInterval(interval);
        logger.warn('Client disconnected during download test', {
            transport: req.transport,
            bytesTransferred
        });
    });
});

/**
 * Multi-stream download test
 * GET /api/download/multi?streams=4&duration=20
 */
router.get('/multi', (req, res) => {
    const streams = Math.min(parseInt(req.query.streams) || 4, 16); // max 16 streams
    const duration = Math.min(parseInt(req.query.duration) || 20, 120);
    
    logger.info('Starting multi-stream download test', {
        transport: req.transport,
        streams,
        duration,
        clientIp: req.ip
    });
    
    res.json({
        message: 'Multi-stream download test',
        streams,
        duration,
        instruction: 'Client should open multiple connections to /api/download/single',
        endpoint: `/api/download/single?duration=${duration}`
    });
});

/**
 * Download test metadata
 * GET /api/download/info
 */
router.get('/info', (req, res) => {
    res.json({
        transport: req.transport,
        port: req.transportPort,
        dataCenterId: req.app.get('dataCenterId'),
        endpoints: {
            single: '/api/download/single',
            multi: '/api/download/multi'
        },
        limits: {
            maxDuration: 120,
            maxChunkSize: 1048576,
            maxStreams: 16
        }
    });
});

module.exports = router;
