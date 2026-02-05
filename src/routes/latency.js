/**
 * Latency Test Routes
 * Simple ping/pong for latency measurement
 * WebSocket latency is handled in server.js
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * HTTP ping endpoint
 * GET /api/latency/ping
 */
router.get('/ping', (req, res) => {
    const timestamp = Date.now();
    
    res.json({
        pong: true,
        timestamp,
        transport: req.transport,
        port: req.transportPort,
        serverTime: new Date().toISOString()
    });
});

/**
 * Echo endpoint for latency testing
 * POST /api/latency/echo
 */
router.post('/echo', (req, res) => {
    const clientTimestamp = req.body.timestamp || Date.now();
    const serverTimestamp = Date.now();
    
    res.json({
        clientTimestamp,
        serverTimestamp,
        transport: req.transport,
        echo: req.body.data || null
    });
});

/**
 * Latency test series
 * POST /api/latency/series
 */
router.post('/series', async (req, res) => {
    const count = Math.min(parseInt(req.body.count) || 10, 100); // max 100 pings
    const interval = Math.max(parseInt(req.body.interval) || 100, 10); // min 10ms
    
    const results = [];
    const startTime = Date.now();
    
    logger.info('Starting latency test series', {
        transport: req.transport,
        count,
        interval,
        clientIp: req.ip
    });
    
    for (let i = 0; i < count; i++) {
        const pingTime = Date.now();
        results.push({
            sequence: i,
            timestamp: pingTime,
            serverTime: new Date(pingTime).toISOString()
        });
        
        // Wait for interval
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const response = {
        testType: 'latency-series',
        transport: req.transport,
        port: req.transportPort,
        count,
        interval,
        duration,
        results,
        timestamp: new Date().toISOString()
    };
    
    logger.logTestResult({
        testType: 'latency-series',
        transport: req.transport,
        count,
        duration
    });
    
    res.json(response);
});

/**
 * Latency test info
 * GET /api/latency/info
 */
router.get('/info', (req, res) => {
    res.json({
        transport: req.transport,
        port: req.transportPort,
        endpoints: {
            ping: '/api/latency/ping',
            echo: '/api/latency/echo',
            series: '/api/latency/series',
            websocket: '/ws/latency'
        },
        limits: {
            maxSeriesCount: 100,
            minInterval: 10
        },
        note: 'For best latency measurement, use WebSocket endpoint at /ws/latency'
    });
});

module.exports = router;
