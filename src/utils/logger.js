/**
 * Logger utility
 * Structured JSON logging to stdout (Docker-friendly)
 */

const config = require('../config/config');

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

class Logger {
    log(level, message, meta = {}) {
        if (LOG_LEVELS[level] > currentLevel) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            dataCenterId: config.dataCenterId,
            ...meta
        };

        // Output as JSON for structured logging
        console.log(JSON.stringify(logEntry));
    }

    error(message, error) {
        const meta = error ? {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            }
        } : {};
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Log test results in structured format
    logTestResult(result) {
        this.log('info', 'Test completed', {
            testResult: result,
            category: 'test_result'
        });
    }
}

module.exports = new Logger();
