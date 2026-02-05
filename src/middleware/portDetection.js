/**
 * Port Detection Middleware
 * Detects which port the request came in on and sets the transport type
 * This is critical for SD-WAN policy validation
 */

const config = require('../config/config');
const logger = require('../utils/logger');

function portDetectionMiddleware(req, res, next) {
    // Get the port from the socket
    const port = req.socket.localPort;
    
    // Determine transport based on port
    if (port === config.goldPort) {
        req.transport = 'gold';
        req.transportPort = config.goldPort;
    } else if (port === config.silverPort) {
        req.transport = 'silver';
        req.transportPort = config.silverPort;
    } else {
        req.transport = 'unknown';
        req.transportPort = port;
        logger.warn('Request received on unexpected port', { port });
    }
    
    // Add to response headers for debugging
    res.setHeader('X-Transport-Type', req.transport);
    res.setHeader('X-Transport-Port', req.transportPort);
    res.setHeader('X-Data-Center', config.dataCenterId);
    
    next();
}

module.exports = portDetectionMiddleware;
