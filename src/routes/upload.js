/**
 * Upload Test Routes
 * Receives upload data and measures throughput (data is immediately discarded)
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const logger = require('../utils/logger');
const { testLimiter, concurrentLimitMiddleware } = require('../middleware/rateLimit');

// Apply rate limiting
router.use(testLimiter);
router.use(concurrentLimitMiddleware);

/**
 * Upload test endpoint - receives data and discards it
 * POST /api/upload
 */
router.post('/', (req, res) => {
    const startTime = Date.now();
    let bytesReceived = 0;
    let chunks = 0;
    
    // Get content length if provided
    const contentLength = parseInt(req.headers['content-length']) || 0;
    
    // Validate size limit
    if (contentLength > config.maxUploadSize) {
        return res.status(413).json({
            error: 'File too large',
            maxSize: config.maxUploadSize,
            receivedSize: contentLength
        });
    }
    
    logger.info('Starting upload test', {
        transport: req.transport,
        contentLength,
        clientIp: req.ip
    });
    
    // Stream the upload data (discard it)
    req.on('data', (chunk) => {
        bytesReceived += chunk.length;
        chunks++;
        
        // Enforce max size during upload
        if (bytesReceived > config.maxUploadSize) {
            req.pause();
            res.status(413).json({
                error: 'Upload size exceeded',
                maxSize: config.maxUploadSize
            });
            req.destroy();
            return;
        }
    });
    
    req.on('end', () => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // seconds
        const throughputMbps = ((bytesReceived * 8) / (duration * 1000000)).toFixed(2);
        
        const result = {
            success: true,
            testType: 'upload',
            transport: req.transport,
            port: req.transportPort,
            dataCenterId: config.dataCenterId,
            bytesReceived,
            duration,
            throughputMbps: parseFloat(throughputMbps),
            chunks,
            timestamp: new Date().toISOString()
        };
        
        logger.logTestResult(result);
        
        res.json(result);
    });
    
    req.on('error', (error) => {
        logger.error('Upload test error', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    });
    
    // Handle client abort
    req.on('aborted', () => {
        logger.warn('Upload test aborted by client', {
            transport: req.transport,
            bytesReceived
        });
    });
});

/**
 * Upload test info endpoint
 * GET /api/upload/info
 */
router.get('/info', (req, res) => {
    res.json({
        transport: req.transport,
        port: req.transportPort,
        dataCenterId: config.dataCenterId,
        maxUploadSize: config.maxUploadSize,
        maxUploadSizeMB: (config.maxUploadSize / (1024 * 1024)).toFixed(0),
        endpoint: '/api/upload',
        method: 'POST',
        note: 'Files are immediately discarded after upload. No data is retained.'
    });
});

module.exports = router;
