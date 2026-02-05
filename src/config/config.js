/**
 * Configuration module
 * Loads and validates configuration from environment variables
 */

const path = require('path');

const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // Data Center
    dataCenterId: process.env.DATA_CENTER_ID || 'DC1-UNKNOWN',
    
    // Ports (critical - SD-WAN policy relies on these)
    goldPort: parseInt(process.env.GOLD_PORT) || 8888,
    silverPort: parseInt(process.env.SILVER_PORT) || 8889,
    
    // Test limits
    maxConcurrentTests: parseInt(process.env.MAX_CONCURRENT_TESTS) || 20,
    maxTestDuration: parseInt(process.env.MAX_TEST_DURATION) || 600, // seconds
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 262144000, // 250 MB
    
    // Rate limiting
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    rateLimitPerIpConcurrent: parseInt(process.env.RATE_LIMIT_PER_IP_CONCURRENT) || 3,
    
    // Diagnostics
    enableDiagnostics: process.env.ENABLE_DIAGNOSTICS === 'true',
    maxConcurrentDiagnostics: parseInt(process.env.MAX_CONCURRENT_DIAGNOSTICS) || 5,
    diagnosticTimeout: parseInt(process.env.DIAGNOSTIC_TIMEOUT) || 30000,
    approvedTargets: (process.env.APPROVED_TARGETS || '8.8.8.8,1.1.1.1').split(','),
    
    // Security
    enableCors: process.env.ENABLE_CORS === 'true',
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
    
    // Logging
    logToFile: process.env.LOG_TO_FILE === 'true',
    logDir: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 7
};

// Validation
if (config.goldPort === config.silverPort) {
    throw new Error('GOLD_PORT and SILVER_PORT must be different');
}

if (config.maxUploadSize > 500 * 1024 * 1024) {
    throw new Error('MAX_UPLOAD_SIZE cannot exceed 500 MB');
}

module.exports = config;
