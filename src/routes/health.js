/**
 * Health Check Route
 * Used by Docker healthcheck and monitoring systems
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');

router.get('/', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dataCenterId: config.dataCenterId,
        transport: req.transport,
        port: req.transportPort,
        memoryUsage: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        }
    };
    
    res.json(health);
});

module.exports = router;
