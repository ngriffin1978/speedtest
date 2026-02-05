/**
 * Diagnostics Routes
 * Advanced diagnostics for Ludacris mode (traceroute, MTR, etc.)
 * SECURITY: Only approved targets allowed
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../config/config');
const logger = require('../utils/logger');
const { testLimiter } = require('../middleware/rateLimit');

const execAsync = promisify(exec);

// Concurrent diagnostics counter
let activeDiagnostics = 0;

/**
 * Validate target against approved list
 */
function isApprovedTarget(target) {
    // Basic validation - IPv4 or hostname
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/;
    
    if (!ipv4Regex.test(target) && !hostnameRegex.test(target)) {
        return false;
    }
    
    // Check against approved list
    return config.approvedTargets.some(approved => {
        return target === approved || target.endsWith(`.${approved}`);
    });
}

/**
 * Check if diagnostics are enabled and within limits
 */
function checkDiagnosticsAvailable(req, res, next) {
    if (!config.enableDiagnostics) {
        return res.status(403).json({
            error: 'Diagnostics are disabled',
            message: 'Contact administrator to enable diagnostic features'
        });
    }
    
    if (activeDiagnostics >= config.maxConcurrentDiagnostics) {
        return res.status(429).json({
            error: 'Too many concurrent diagnostics',
            active: activeDiagnostics,
            limit: config.maxConcurrentDiagnostics
        });
    }
    
    next();
}

router.use(testLimiter);
router.use(checkDiagnosticsAvailable);

/**
 * Traceroute
 * POST /api/diagnostics/traceroute
 */
router.post('/traceroute', async (req, res) => {
    const target = req.body.target;
    
    if (!target || !isApprovedTarget(target)) {
        return res.status(400).json({
            error: 'Invalid or unapproved target',
            approvedTargets: config.approvedTargets
        });
    }
    
    activeDiagnostics++;
    
    logger.info('Starting traceroute', {
        target,
        transport: req.transport,
        clientIp: req.ip
    });
    
    try {
        // Use timeout to prevent hanging
        const { stdout, stderr } = await execAsync(
            `timeout ${config.diagnosticTimeout / 1000} traceroute -m 30 -w 2 ${target}`,
            { maxBuffer: 1024 * 1024 }
        );
        
        res.json({
            success: true,
            target,
            transport: req.transport,
            output: stdout,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Traceroute failed', error);
        res.status(500).json({
            error: 'Traceroute failed',
            target,
            message: error.message
        });
    } finally {
        activeDiagnostics--;
    }
});

/**
 * MTR (My Traceroute)
 * POST /api/diagnostics/mtr
 */
router.post('/mtr', async (req, res) => {
    const target = req.body.target;
    const count = Math.min(parseInt(req.body.count) || 10, 50);
    
    if (!target || !isApprovedTarget(target)) {
        return res.status(400).json({
            error: 'Invalid or unapproved target',
            approvedTargets: config.approvedTargets
        });
    }
    
    activeDiagnostics++;
    
    logger.info('Starting MTR', {
        target,
        count,
        transport: req.transport,
        clientIp: req.ip
    });
    
    try {
        const { stdout, stderr } = await execAsync(
            `timeout ${config.diagnosticTimeout / 1000} mtr -c ${count} -r -w ${target}`,
            { maxBuffer: 1024 * 1024 }
        );
        
        res.json({
            success: true,
            target,
            count,
            transport: req.transport,
            output: stdout,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('MTR failed', error);
        res.status(500).json({
            error: 'MTR failed',
            target,
            message: error.message
        });
    } finally {
        activeDiagnostics--;
    }
});

/**
 * Path MTU discovery simulation
 * POST /api/diagnostics/mtu
 */
router.post('/mtu', async (req, res) => {
    const target = req.body.target;
    
    if (!target || !isApprovedTarget(target)) {
        return res.status(400).json({
            error: 'Invalid or unapproved target',
            approvedTargets: config.approvedTargets
        });
    }
    
    activeDiagnostics++;
    
    logger.info('Starting MTU detection', {
        target,
        transport: req.transport,
        clientIp: req.ip
    });
    
    try {
        // Ping with different packet sizes to detect MTU issues
        const sizes = [1472, 1464, 1400, 1300, 1200, 1100, 1000];
        const results = [];
        
        for (const size of sizes) {
            try {
                const { stdout } = await execAsync(
                    `timeout 5 ping -c 1 -M do -s ${size} ${target}`,
                    { maxBuffer: 64 * 1024 }
                );
                results.push({ size, success: true });
            } catch (error) {
                results.push({ size, success: false });
            }
        }
        
        res.json({
            success: true,
            target,
            transport: req.transport,
            results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('MTU detection failed', error);
        res.status(500).json({
            error: 'MTU detection failed',
            target,
            message: error.message
        });
    } finally {
        activeDiagnostics--;
    }
});

/**
 * Diagnostics info
 * GET /api/diagnostics/info
 */
router.get('/info', (req, res) => {
    res.json({
        enabled: config.enableDiagnostics,
        transport: req.transport,
        endpoints: {
            traceroute: '/api/diagnostics/traceroute',
            mtr: '/api/diagnostics/mtr',
            mtu: '/api/diagnostics/mtu'
        },
        approvedTargets: config.approvedTargets,
        limits: {
            maxConcurrent: config.maxConcurrentDiagnostics,
            activeDiagnostics,
            timeout: config.diagnosticTimeout
        }
    });
});

module.exports = router;
