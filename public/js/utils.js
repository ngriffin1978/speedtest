/**
 * Utility Functions
 * Helper functions used throughout the application
 */

const Utils = {
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Format Mbps throughput
     */
    formatThroughput(mbps) {
        if (mbps >= 1000) {
            return (mbps / 1000).toFixed(2) + ' Gbps';
        }
        return mbps.toFixed(2) + ' Mbps';
    },

    /**
     * Calculate throughput from bytes and duration
     */
    calculateThroughput(bytes, durationSeconds) {
        const bits = bytes * 8;
        const mbps = bits / (durationSeconds * 1000000);
        return mbps;
    },

    /**
     * Format timestamp
     */
    formatTimestamp(date = new Date()) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * Format duration in seconds to readable string
     */
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)} seconds`;
        }
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
    },

    /**
     * Calculate statistics from array of numbers
     */
    calculateStats(values) {
        if (!values || values.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0 };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        // Median
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        
        // Standard deviation
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(avgSquareDiff);

        return {
            min: parseFloat(min.toFixed(2)),
            max: parseFloat(max.toFixed(2)),
            avg: parseFloat(avg.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            stdDev: parseFloat(stdDev.toFixed(2))
        };
    },

    /**
     * Get port based on transport type
     */
    getPortForTransport(transport) {
        return transport === 'gold' ? 8888 : 8889;
    },

    /**
     * Get transport name
     */
    getTransportName(transport) {
        if (transport === 'gold') return 'Gold';
        if (transport === 'silver') return 'Silver';
        return 'Unknown';
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generate random bytes for upload testing
     * Chunks generation to respect browser's 64KB limit on crypto.getRandomValues()
     */
    generateRandomData(sizeInBytes) {
        const CHUNK_SIZE = 65536; // 64KB - max size for crypto.getRandomValues()
        const chunks = [];
        let remaining = sizeInBytes;

        // Generate data in chunks
        while (remaining > 0) {
            const chunkSize = Math.min(CHUNK_SIZE, remaining);
            const chunk = new Uint8Array(chunkSize);
            crypto.getRandomValues(chunk);
            chunks.push(chunk);
            remaining -= chunkSize;
        }

        // Combine all chunks into a single ArrayBuffer
        const result = new Uint8Array(sizeInBytes);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    },

    /**
     * Download JSON as file
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Add log entry with timestamp
     */
    addLogEntry(container, message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `<span class="timestamp">[${this.formatTimestamp()}]</span> ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Validate file size
     */
    validateFileSize(file, maxSize = 250 * 1024 * 1024) {
        return file.size <= maxSize;
    },

    /**
     * Detect if running on mobile device
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Get optimal number of streams based on device
     */
    getOptimalStreamCount(requestedStreams) {
        if (this.isMobileDevice()) {
            // Limit to 2 streams on mobile to avoid quota errors
            return Math.min(requestedStreams, 2);
        }
        return requestedStreams;
    }
};

// Make Utils available globally
window.Utils = Utils;
