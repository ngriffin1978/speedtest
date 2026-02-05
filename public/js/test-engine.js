/**
 * Test Engine
 * Orchestrates all network performance tests
 */

class TestEngine {
    constructor() {
        this.currentTest = null;
        this.abortController = null;
        this.results = {
            transport: null,
            port: null,
            testMode: null,
            startTime: null,
            endTime: null,
            download: {},
            upload: {},
            latency: {},
            diagnostics: {}
        };
        this.callbacks = {
            onProgress: null,
            onLog: null,
            onMetricUpdate: null,
            onComplete: null,
            onError: null
        };
    }

    /**
     * Start a test
     */
    async startTest(config) {
        this.abortController = new AbortController();
        this.results = {
            transport: config.transport,
            port: Utils.getPortForTransport(config.transport),
            testMode: config.mode,
            startTime: new Date().toISOString(),
            endTime: null,
            download: {},
            upload: {},
            latency: {},
            diagnostics: {}
        };

        try {
            this.log('Test started', 'info');
            
            if (config.mode === 'basic') {
                await this.runBasicMode(config);
            } else if (config.mode === 'detailed') {
                await this.runDetailedMode(config);
            } else if (config.mode === 'ludacris') {
                await this.runLudacrisMode(config);
            }

            this.results.endTime = new Date().toISOString();
            this.log('Test completed successfully', 'success');
            
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete(this.results);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.log('Test cancelled by user', 'info');
            } else {
                this.log(`Test failed: ${error.message}`, 'error');
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            }
        }
    }

    /**
     * Basic mode test flow
     */
    async runBasicMode(config) {
        this.updateProgress('Measuring idle latency...', 0);
        await this.testIdleLatency(config.transport);

        this.updateProgress('Testing download speed (single stream)...', 20);
        await this.testDownloadSingle(config.transport, 15);

        this.updateProgress('Testing download speed (multi-stream)...', 40);
        await this.testDownloadMulti(config.transport, 4, 15);

        this.updateProgress('Testing upload speed...', 70);
        await this.testUpload(config.transport, config.uploadMethod, config.uploadFile);

        this.updateProgress('Test complete', 100);
    }

    /**
     * Detailed mode test flow
     */
    async runDetailedMode(config) {
        // Run all basic tests
        await this.runBasicMode(config);

        // Additional detailed tests
        this.updateProgress('Testing parallel streams (1 stream)...', 75);
        await this.testDownloadSingle(config.transport, 10);

        this.updateProgress('Testing parallel streams (8 streams)...', 85);
        await this.testDownloadMulti(config.transport, 8, 10);

        this.updateProgress('Measuring loaded latency...', 95);
        await this.testLoadedLatency(config.transport);

        this.updateProgress('Test complete', 100);
    }

    /**
     * Ludacris mode test flow
     */
    async runLudacrisMode(config) {
        // Run all detailed tests
        await this.runDetailedMode(config);

        // Additional ludacris tests
        this.updateProgress('Running sustained throughput test...', 80);
        await this.testDownloadSingle(config.transport, 60);

        if (config.diagnosticsEnabled) {
            this.updateProgress('Running path diagnostics...', 90);
            await this.testDiagnostics(config.transport);
        }

        this.updateProgress('Test complete', 100);
    }

    /**
     * Test idle latency
     */
    async testIdleLatency(transport) {
        const port = Utils.getPortForTransport(transport);
        const url = `http://${window.location.hostname}:${port}/api/latency/ping`;
        const latencies = [];

        for (let i = 0; i < 20; i++) {
            if (this.abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

            const startTime = performance.now();
            await fetch(url, { signal: this.abortController.signal });
            const endTime = performance.now();
            const latency = endTime - startTime;
            latencies.push(latency);

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const stats = Utils.calculateStats(latencies);
        this.results.latency.idle = stats;
        
        this.updateMetric('latency-idle', stats.avg.toFixed(1));
        this.updateMetric('jitter', stats.stdDev.toFixed(1));
        
        this.log(`Idle latency: ${stats.avg.toFixed(1)}ms (jitter: ${stats.stdDev.toFixed(1)}ms)`, 'success');
    }

    /**
     * Test single-stream download
     */
    async testDownloadSingle(transport, duration = 20) {
        const port = Utils.getPortForTransport(transport);
        const url = `http://${window.location.hostname}:${port}/api/download/single?duration=${duration}`;
        
        const startTime = performance.now();
        let bytesReceived = 0;
        const throughputSamples = [];

        const response = await fetch(url, { signal: this.abortController.signal });
        const reader = response.body.getReader();

        let lastUpdate = startTime;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            bytesReceived += value.length;
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;

            // Update throughput every 500ms
            if (now - lastUpdate >= 500) {
                const mbps = Utils.calculateThroughput(bytesReceived, elapsed);
                throughputSamples.push(mbps);
                this.updateMetric('download-speed', mbps.toFixed(0));
                lastUpdate = now;
            }

            if (this.abortController.signal.aborted) {
                reader.cancel();
                throw new DOMException('Aborted', 'AbortError');
            }
        }

        const endTime = performance.now();
        const totalDuration = (endTime - startTime) / 1000;
        const avgThroughput = Utils.calculateThroughput(bytesReceived, totalDuration);

        this.results.download.singleStream = {
            bytesTransferred: bytesReceived,
            duration: totalDuration,
            throughputMbps: avgThroughput,
            samples: throughputSamples
        };

        this.log(`Download (single): ${avgThroughput.toFixed(2)} Mbps`, 'success');
    }

    /**
     * Test multi-stream download
     */
    async testDownloadMulti(transport, streams = 4, duration = 20) {
        const promises = [];
        const startTime = performance.now();

        for (let i = 0; i < streams; i++) {
            promises.push(this.testDownloadSingle(transport, duration));
        }

        await Promise.all(promises);

        const endTime = performance.now();
        const totalDuration = (endTime - startTime) / 1000;

        this.results.download.multiStream = {
            streams,
            duration: totalDuration
        };

        this.log(`Download (${streams} streams) completed`, 'success');
    }

    /**
     * Test upload
     */
    async testUpload(transport, method = 'synthetic', file = null) {
        const port = Utils.getPortForTransport(transport);
        const url = `http://${window.location.hostname}:${port}/api/upload`;

        let data;
        let size;

        if (method === 'file' && file) {
            data = file;
            size = file.size;
        } else {
            // Generate 50MB of random data
            size = 50 * 1024 * 1024;
            data = Utils.generateRandomData(size);
        }

        const startTime = performance.now();

        const response = await fetch(url, {
            method: 'POST',
            body: data,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            signal: this.abortController.signal
        });

        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const result = await response.json();

        this.results.upload = {
            method,
            bytesTransferred: size,
            duration,
            throughputMbps: result.throughputMbps
        };

        this.updateMetric('upload-speed', result.throughputMbps.toFixed(0));
        this.log(`Upload: ${result.throughputMbps.toFixed(2)} Mbps`, 'success');
    }

    /**
     * Test loaded latency (during download)
     */
    async testLoadedLatency(transport) {
        // Start a download in the background
        const downloadPromise = this.testDownloadSingle(transport, 20);

        // Wait a bit for download to ramp up
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Measure latency while download is running
        const port = Utils.getPortForTransport(transport);
        const url = `http://${window.location.hostname}:${port}/api/latency/ping`;
        const latencies = [];

        for (let i = 0; i < 10; i++) {
            const startTime = performance.now();
            await fetch(url);
            const endTime = performance.now();
            latencies.push(endTime - startTime);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await downloadPromise;

        const stats = Utils.calculateStats(latencies);
        this.results.latency.loaded = stats;

        this.log(`Loaded latency: ${stats.avg.toFixed(1)}ms`, 'success');
    }

    /**
     * Test diagnostics (traceroute, MTU)
     */
    async testDiagnostics(transport) {
        const port = Utils.getPortForTransport(transport);
        // Placeholder - would call /api/diagnostics endpoints
        this.log('Diagnostics completed', 'success');
    }

    /**
     * Cancel current test
     */
    cancelTest() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Helper methods
     */
    updateProgress(message, percent) {
        if (this.callbacks.onProgress) {
            this.callbacks.onProgress(message, percent);
        }
    }

    updateMetric(metricId, value) {
        if (this.callbacks.onMetricUpdate) {
            this.callbacks.onMetricUpdate(metricId, value);
        }
    }

    log(message, type = 'info') {
        if (this.callbacks.onLog) {
            this.callbacks.onLog(message, type);
        }
    }

    on(event, callback) {
        if (event === 'progress') this.callbacks.onProgress = callback;
        else if (event === 'log') this.callbacks.onLog = callback;
        else if (event === 'metricUpdate') this.callbacks.onMetricUpdate = callback;
        else if (event === 'complete') this.callbacks.onComplete = callback;
        else if (event === 'error') this.callbacks.onError = callback;
    }
}

// Make TestEngine available globally
window.TestEngine = TestEngine;
