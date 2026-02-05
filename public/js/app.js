/**
 * Main Application
 * Coordinates UI Controller and Test Engine
 */

class App {
    constructor() {
        this.ui = new UIController();
        this.testEngine = new TestEngine();
        this.setupEventHandlers();
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        console.log('SD-WAN Speed Test initialized');
        await this.ui.loadServerInfo();
        
        // Override UI controller event handlers
        this.ui.onStartTest = () => this.startTest();
        this.ui.onCancelTest = () => this.cancelTest();
    }

    /**
     * Setup test engine event handlers
     */
    setupEventHandlers() {
        this.testEngine.on('progress', (message, percent) => {
            this.ui.updateProgress(message, percent);
        });

        this.testEngine.on('log', (message, type) => {
            this.ui.addLog(message, type);
        });

        this.testEngine.on('metricUpdate', (metricId, value) => {
            this.ui.updateMetric(metricId, value);
        });

        this.testEngine.on('complete', (results) => {
            this.onTestComplete(results);
        });

        this.testEngine.on('error', (error) => {
            this.onTestError(error);
        });
    }

    /**
     * Start a test
     */
    async startTest() {
        // Validate configuration
        if (this.ui.state.uploadMethod === 'file' && !this.ui.state.uploadFile) {
            alert('Please select a file for upload testing or choose synthetic data');
            return;
        }

        // Show progress view
        this.ui.showProgressView();

        // Build test configuration
        const config = {
            transport: this.ui.state.transport,
            mode: this.ui.state.testMode,
            uploadMethod: this.ui.state.uploadMethod,
            uploadFile: this.ui.state.uploadFile,
            diagnosticsEnabled: this.ui.state.testMode === 'ludacris'
        };

        // Handle "Both" mode - run Gold then Silver
        if (config.transport === 'both') {
            await this.runBothTransports(config);
        } else {
            await this.testEngine.startTest(config);
        }
    }

    /**
     * Run tests on both Gold and Silver transports
     */
    async runBothTransports(config) {
        const results = {
            mode: config.mode,
            both: true,
            gold: null,
            silver: null
        };

        // Run Gold transport
        this.ui.addLog('Starting Gold transport test...', 'info');
        const goldConfig = { ...config, transport: 'gold' };
        await this.testEngine.startTest(goldConfig);
        results.gold = { ...this.testEngine.results };

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run Silver transport
        this.ui.addLog('Starting Silver transport test...', 'info');
        const silverConfig = { ...config, transport: 'silver' };
        await this.testEngine.startTest(silverConfig);
        results.silver = { ...this.testEngine.results };

        // Show comparison
        this.onBothTestsComplete(results);
    }

    /**
     * Cancel current test
     */
    cancelTest() {
        if (confirm('Are you sure you want to cancel the test?')) {
            this.testEngine.cancelTest();
            this.ui.showConfigView();
        }
    }

    /**
     * Handle test completion
     */
    onTestComplete(results) {
        console.log('Test completed:', results);
        window.lastTestResults = results;
        this.ui.showResultsView(results);
    }

    /**
     * Handle both tests completion (Gold + Silver)
     */
    onBothTestsComplete(results) {
        console.log('Both tests completed:', results);
        window.lastTestResults = results;
        // For now, just show the Silver results
        // In a full implementation, we'd show a comparison view
        this.ui.showResultsView(results.silver);
    }

    /**
     * Handle test error
     */
    onTestError(error) {
        console.error('Test error:', error);
        alert(`Test failed: ${error.message}`);
        this.ui.showConfigView();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
