/**
 * UI Controller
 * Manages all UI state and interactions
 */

class UIController {
    constructor() {
        this.state = {
            transport: 'gold',
            testMode: 'basic',
            uploadMethod: 'synthetic',
            uploadFile: null,
            currentView: 'config', // config, progress, results, comparison
            testRunning: false
        };

        this.elements = {};
        this.initializeElements();
        this.attachEventListeners();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Panels
            configPanel: document.getElementById('config-panel'),
            uploadPanel: document.getElementById('upload-panel'),
            progressPanel: document.getElementById('progress-panel'),
            resultsPanel: document.getElementById('results-panel'),
            comparisonPanel: document.getElementById('comparison-panel'),
            infoGrid: document.getElementById('info-grid'),

            // Config elements
            transportButtons: document.querySelectorAll('[data-transport]'),
            modeButtons: document.querySelectorAll('[data-mode]'),
            startTestBtn: document.getElementById('start-test-btn'),

            // Upload elements
            uploadMethodOptions: document.querySelectorAll('[data-upload-method]'),
            dropzone: document.getElementById('dropzone'),
            fileInput: document.getElementById('file-input'),
            browseBtn: document.getElementById('browse-btn'),
            fileSelected: document.getElementById('file-selected'),
            selectedFileName: document.getElementById('selected-file-name'),
            selectedFileSize: document.getElementById('selected-file-size'),

            // Progress elements
            currentTestName: document.getElementById('current-test-name'),
            progressFill: document.getElementById('progress-fill'),
            progressSteps: document.getElementById('progress-steps'),
            testLog: document.getElementById('test-log'),
            cancelTestBtn: document.getElementById('cancel-test-btn'),

            // Metric displays
            downloadSpeed: document.getElementById('download-speed'),
            uploadSpeed: document.getElementById('upload-speed'),
            latencyIdle: document.getElementById('latency-idle'),
            jitter: document.getElementById('jitter'),

            // Results elements
            resultInfo: document.getElementById('result-info'),
            resultTransportBadge: document.getElementById('result-transport-badge'),
            resultAlerts: document.getElementById('result-alerts'),
            summaryMetrics: document.getElementById('summary-metrics'),
            detailedResults: document.getElementById('detailed-results'),

            // Action buttons
            newTestBtn: document.getElementById('new-test-btn'),
            exportJsonBtn: document.getElementById('export-json-btn'),
            compareBtn: document.getElementById('compare-btn'),

            // Server info
            serverInfo: document.getElementById('server-info')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Transport selection
        this.elements.transportButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectTransport(btn.dataset.transport));
        });

        // Mode selection
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
        });

        // Start test
        this.elements.startTestBtn.addEventListener('click', () => this.onStartTest());

        // Upload method selection
        this.elements.uploadMethodOptions.forEach(option => {
            option.addEventListener('click', () => this.selectUploadMethod(option.dataset.uploadMethod));
        });

        // File upload
        if (this.elements.browseBtn) {
            this.elements.browseBtn.addEventListener('click', () => this.elements.fileInput.click());
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Drag and drop
        if (this.elements.dropzone) {
            this.elements.dropzone.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.elements.dropzone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.elements.dropzone.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // Cancel test
        if (this.elements.cancelTestBtn) {
            this.elements.cancelTestBtn.addEventListener('click', () => this.onCancelTest());
        }

        // New test
        if (this.elements.newTestBtn) {
            this.elements.newTestBtn.addEventListener('click', () => this.showConfigView());
        }

        // Export JSON
        if (this.elements.exportJsonBtn) {
            this.elements.exportJsonBtn.addEventListener('click', () => this.exportResults());
        }
    }

    /**
     * Select transport
     */
    selectTransport(transport) {
        this.state.transport = transport;
        this.elements.transportButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.transport === transport);
        });
    }

    /**
     * Select test mode
     */
    selectMode(mode) {
        this.state.testMode = mode;
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    /**
     * Select upload method
     */
    selectUploadMethod(method) {
        this.state.uploadMethod = method;
        this.elements.uploadMethodOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.uploadMethod === method);
        });

        // Show/hide dropzone
        if (method === 'file') {
            this.elements.dropzone.style.display = 'block';
        } else {
            this.elements.dropzone.style.display = 'none';
            this.elements.fileSelected.classList.remove('active');
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (Utils.validateFileSize(file)) {
                this.state.uploadFile = file;
                this.elements.selectedFileName.textContent = file.name;
                this.elements.selectedFileSize.textContent = `${Utils.formatBytes(file.size)} • Ready to upload`;
                this.elements.fileSelected.classList.add('active');
            } else {
                alert('File size exceeds 250 MB limit');
            }
        }
    }

    /**
     * Handle drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropzone.classList.add('drag-over');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropzone.classList.remove('drag-over');
    }

    /**
     * Handle file drop
     */
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropzone.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (Utils.validateFileSize(file)) {
                this.state.uploadFile = file;
                this.elements.selectedFileName.textContent = file.name;
                this.elements.selectedFileSize.textContent = `${Utils.formatBytes(file.size)} • Ready to upload`;
                this.elements.fileSelected.classList.add('active');
            } else {
                alert('File size exceeds 250 MB limit');
            }
        }
    }

    /**
     * Show configuration view
     */
    showConfigView() {
        this.state.currentView = 'config';
        this.elements.configPanel.style.display = 'block';
        this.elements.uploadPanel.style.display = 'none';
        this.elements.progressPanel.style.display = 'none';
        this.elements.resultsPanel.style.display = 'none';
        this.elements.comparisonPanel.style.display = 'none';
        this.elements.infoGrid.style.display = 'grid';
    }

    /**
     * Show progress view
     */
    showProgressView() {
        this.state.currentView = 'progress';
        this.state.testRunning = true;
        this.elements.configPanel.style.display = 'none';
        this.elements.uploadPanel.style.display = 'none';
        this.elements.progressPanel.style.display = 'block';
        this.elements.resultsPanel.style.display = 'none';
        this.elements.comparisonPanel.style.display = 'none';
        this.elements.infoGrid.style.display = 'none';

        // Clear previous test data
        this.elements.testLog.innerHTML = '';
        this.elements.progressFill.style.width = '0%';
        this.resetMetrics();
    }

    /**
     * Show results view
     */
    showResultsView(results) {
        this.state.currentView = 'results';
        this.state.testRunning = false;
        this.elements.configPanel.style.display = 'none';
        this.elements.uploadPanel.style.display = 'none';
        this.elements.progressPanel.style.display = 'none';
        this.elements.resultsPanel.style.display = 'block';
        this.elements.comparisonPanel.style.display = 'none';
        this.elements.infoGrid.style.display = 'none';

        this.displayResults(results);
    }

    /**
     * Update progress
     */
    updateProgress(message, percent) {
        this.elements.currentTestName.textContent = message;
        this.elements.progressFill.style.width = `${percent}%`;
    }

    /**
     * Update metric display
     */
    updateMetric(metricId, value) {
        const element = document.getElementById(metricId);
        if (element) {
            // Use correct units based on metric type
            const unit = (metricId === 'latency-idle' || metricId === 'jitter') ? 'ms' : 'Mbps';
            element.innerHTML = `${value}<span class="metric-unit">${unit}</span>`;
        }
    }

    /**
     * Add log entry
     */
    addLog(message, type = 'info') {
        Utils.addLogEntry(this.elements.testLog, message, type);
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.elements.downloadSpeed.innerHTML = '--<span class="metric-unit">Mbps</span>';
        this.elements.uploadSpeed.innerHTML = '--<span class="metric-unit">Mbps</span>';
        this.elements.latencyIdle.innerHTML = '--<span class="metric-unit">ms</span>';
        this.elements.jitter.innerHTML = '--<span class="metric-unit">ms</span>';
    }

    /**
     * Display results
     */
    displayResults(results) {
        // Update transport badge
        const transportName = Utils.getTransportName(results.transport);
        this.elements.resultTransportBadge.textContent = `${transportName} Transport • Port ${results.port}`;
        this.elements.resultTransportBadge.className = `transport-badge ${results.transport}`;

        // Create summary metrics
        this.createSummaryMetrics(results);

        // Check for warnings
        this.checkForWarnings(results);
    }

    /**
     * Create summary metric cards
     */
    createSummaryMetrics(results) {
        this.elements.summaryMetrics.innerHTML = '';

        // Download speed
        if (results.download.singleStream) {
            const card = this.createMetricCard(
                'Download Speed',
                results.download.singleStream.throughputMbps,
                'Mbps',
                'excellent'
            );
            this.elements.summaryMetrics.appendChild(card);
        }

        // Upload speed
        if (results.upload.throughputMbps) {
            const card = this.createMetricCard(
                'Upload Speed',
                results.upload.throughputMbps,
                'Mbps',
                'excellent'
            );
            this.elements.summaryMetrics.appendChild(card);
        }

        // Latency
        if (results.latency.idle) {
            const card = this.createMetricCard(
                'Latency (Idle)',
                results.latency.idle.avg,
                'ms',
                'excellent'
            );
            this.elements.summaryMetrics.appendChild(card);
        }

        // Jitter
        if (results.latency.idle) {
            const card = this.createMetricCard(
                'Jitter',
                results.latency.idle.stdDev,
                'ms',
                'excellent'
            );
            this.elements.summaryMetrics.appendChild(card);
        }
    }

    /**
     * Create a metric card
     */
    createMetricCard(label, value, unit, quality) {
        const card = document.createElement('div');
        card.className = `summary-card ${quality}`;
        card.innerHTML = `
            <div class="metric-label">${label}</div>
            <div class="metric-value">
                ${value.toFixed(value < 10 ? 1 : 0)}<span class="metric-unit">${unit}</span>
            </div>
        `;
        return card;
    }

    /**
     * Check for warnings (bufferbloat, etc.)
     */
    checkForWarnings(results) {
        this.elements.resultAlerts.innerHTML = '';

        // Check for bufferbloat
        if (results.latency.idle && results.latency.loaded) {
            const ratio = results.latency.loaded.avg / results.latency.idle.avg;
            if (ratio > 2) {
                const alert = document.createElement('div');
                alert.className = 'alert';
                alert.innerHTML = `
                    <div class="alert-title">⚠ Bufferbloat Detected</div>
                    <div class="alert-content">
                        Loaded latency is ${ratio.toFixed(1)}x higher than idle latency 
                        (${results.latency.loaded.avg.toFixed(0)}ms vs ${results.latency.idle.avg.toFixed(0)}ms). 
                        This indicates bufferbloat in the path.
                    </div>
                `;
                this.elements.resultAlerts.appendChild(alert);
            }
        }
    }

    /**
     * Export results as JSON
     */
    exportResults() {
        if (window.lastTestResults) {
            const filename = `sdwan-speedtest-${Date.now()}.json`;
            Utils.downloadJSON(window.lastTestResults, filename);
        }
    }

    /**
     * Load server info
     */
    async loadServerInfo() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            this.elements.serverInfo.textContent = `Data Center: ${data.dataCenterId} • Client connected`;
        } catch (error) {
            this.elements.serverInfo.textContent = 'Unable to connect to server';
        }
    }

    /**
     * Event handlers to be implemented by app
     */
    onStartTest() {
        // Implemented by app.js
    }

    onCancelTest() {
        // Implemented by app.js
    }
}

// Make UIController available globally
window.UIController = UIController;
