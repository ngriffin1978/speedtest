const express = require('express');
const router = express.Router();
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * GET /api/test/info
 * Returns information about the current test endpoint configuration
 * Useful for clients to verify transport detection and capabilities
 */
router.get('/', (req, res) => {
    try {
        const info = {
            transport: req.transport,
            port: req.socket.localPort,
            dataCenter: config.dataCenterId,
            version: '1.0.0',
            capabilities: {
                download: true,
                upload: true,
                latency: true,
                websocket: true,
                diagnostics: config.enableDiagnostics
            },
            limits: {
                maxTestDuration: config.maxTestDuration,
                maxUploadSize: config.maxUploadSize,
                maxConcurrentTests: config.maxConcurrentTests
            }
        };

        logger.debug('Test info requested', {
            transport: req.transport,
            port: req.socket.localPort,
            clientIp: req.ip
        });

        res.json(info);
    } catch (error) {
        logger.error('Error retrieving test info:', error);
        res.status(500).json({
            error: 'Failed to retrieve test information'
        });
    }
});

module.exports = router;
