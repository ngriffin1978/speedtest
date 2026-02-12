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
 * GET /api/latency/ping?count=N
 * Performs multiple latency measurements and returns statistics
 */
router.get('/ping', async (req, res) => {
    const count = Math.min(parseInt(req.query.count) || 1, 100); // max 100 pings
    const measurements = [];

    // If count is 1, return simple pong response for backward compatibility
    if (count === 1) {
        const timestamp = Date.now();
        return res.json({
            pong: true,
            timestamp,
            transport: req.transport,
            port: req.transportPort,
            serverTime: new Date().toISOString()
        });
    }

    // Perform multiple measurements
    logger.info('Starting latency ping test', {
        transport: req.transport,
        count,
        clientIp: req.ip
    });

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
        const measurementStart = Date.now();

        // Simulate minimal processing delay to get realistic timing
        await new Promise(resolve => setImmediate(resolve));

        const measurementEnd = Date.now();
        const latency = measurementEnd - measurementStart;

        measurements.push({
            sequence: i,
            timestamp: measurementStart,
            latency: latency,
            serverTime: new Date(measurementStart).toISOString()
        });

        // Small delay between measurements (10ms)
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate average latency
    const avgLatency = measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
    const minLatency = Math.min(...measurements.map(m => m.latency));
    const maxLatency = Math.max(...measurements.map(m => m.latency));

    const response = {
        measurements,
        count,
        avgLatency,
        minLatency,
        maxLatency,
        totalDuration,
        transport: req.transport,
        port: req.transportPort,
        timestamp: new Date().toISOString()
    };

    logger.logTestResult({
        testType: 'latency-ping',
        transport: req.transport,
        count,
        avgLatency: avgLatency.toFixed(2),
        duration: totalDuration
    });

    res.json(response);
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
