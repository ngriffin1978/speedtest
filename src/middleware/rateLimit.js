/**
 * Rate Limiting Middleware
 * Protects against abuse and ensures fair resource allocation
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMaxRequests,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimitWindow / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            transport: req.transport
        });
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(config.rateLimitWindow / 1000)
        });
    }
});

// Strict rate limiter for heavy endpoints (upload, download)
const testLimiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: 30, // Increased to accommodate multi-stream tests (4-8 parallel streams + sequential tests)
    message: {
        error: 'Too many test requests. Please wait before starting another test.',
        retryAfter: Math.ceil(config.rateLimitWindow / 1000)
    },
    skipSuccessfulRequests: true // Don't count successfully completed tests
});

// Concurrent request tracker
const concurrentTests = new Map();

function concurrentLimitMiddleware(req, res, next) {
    const clientIp = req.ip;
    const current = concurrentTests.get(clientIp) || 0;
    
    if (current >= config.rateLimitPerIpConcurrent) {
        logger.warn('Concurrent test limit exceeded', {
            ip: clientIp,
            current,
            limit: config.rateLimitPerIpConcurrent
        });
        return res.status(429).json({
            error: 'Too many concurrent tests. Please complete or cancel existing tests first.',
            currentTests: current,
            limit: config.rateLimitPerIpConcurrent
        });
    }
    
    // Increment counter
    concurrentTests.set(clientIp, current + 1);
    
    // Decrement on response finish
    res.on('finish', () => {
        const updated = concurrentTests.get(clientIp) - 1;
        if (updated <= 0) {
            concurrentTests.delete(clientIp);
        } else {
            concurrentTests.set(clientIp, updated);
        }
    });
    
    next();
}

module.exports = globalLimiter;
module.exports.testLimiter = testLimiter;
module.exports.concurrentLimitMiddleware = concurrentLimitMiddleware;
