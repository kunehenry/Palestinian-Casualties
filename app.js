import { CONFIG } from './config.js';
import { debounce, throttle } from './utils.js';
import apiClient from './api.js';
import uiManager from './ui.js';
import chartManager from './chart.js';

class App {
    constructor() {
        this.casualtiesData = {
            gaza: [],
            westbank: []
        };
        this.refreshTimeoutId = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.isInitialLoad = true;

        // Restore saved view from localStorage, default to 'casualty'
        this.currentView = localStorage.getItem('selectedView') || 'casualty';

        // Bind methods to maintain context
        this.handleTabClick = this.handleTabClick.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleRefresh = debounce(this.handleRefresh.bind(this), 1000);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.handleDataUpdate = this.handleDataUpdate.bind(this);
    }

    // Initialize the application
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize UI manager
            uiManager.initialize();

            // Initialize chart manager
            const chartCanvas = document.querySelector('#casualtiesChart');
            chartManager.initialize(chartCanvas);

            // Setup event listeners
            this.setupEventListeners();

            // Restore the saved view state and load data if needed
            await this.switchView(this.currentView);

            // Setup auto-refresh
            this.setupAutoRefresh();

            // Setup pull-to-refresh
            this.setupPullToRefresh();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize application:', error);
            uiManager.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Navigation click handlers
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', this.handleNavClick);
        });

        // Tab click handlers
        document.querySelectorAll('.hero-tab-button, .tab-button').forEach(button => {
            button.addEventListener('click', this.handleTabClick);
        });

        // Visibility change handler for auto-refresh
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Window focus handler
        window.addEventListener('focus', () => {
            if (!document.hidden) {
                this.handleRefresh();
            }
        });

        // Listen for background data updates
        window.addEventListener('dataUpdated', this.handleDataUpdate);

        // Error handlers for uncaught errors and unhandled promise rejections
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

        // Handle background data updates
    async handleDataUpdate(event) {
        const { region } = event.detail;

        // Reload the region data
        try {
            const result = await apiClient.loadRegionData(region, false);
            if (result.success) {
                this.casualtiesData[region] = result.data;

                // Update display if this is the current region
                if (region === uiManager.getCurrentRegion()) {
                    this.updateDisplayForRegion(region);

                    // Show update notification if data changed
                    if (result.hasChanged) {
                        uiManager.showUpdateNotification();
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to update ${region} data:`, error);
        }
    }

        // Handle navigation button clicks
    async handleNavClick(event) {
        const buttonId = event.target.id;
        const newView = buttonId === 'nav-casualty-data' ? 'casualty' : 'donation';

        if (newView === this.currentView) return;

        await this.switchView(newView);
    }

            // Switch between views
    async switchView(view) {
        this.currentView = view;

        // Save current view to localStorage
        localStorage.setItem('selectedView', view);

        // Update navigation button states
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });

        if (view === 'casualty') {
            document.getElementById('nav-casualty-data').classList.add('active');
            document.getElementById('casualty-view').classList.remove('hidden');
            document.querySelector('.main-section').classList.remove('hidden');
            document.getElementById('donation-view').classList.add('hidden');

            // Always load data, but disable progressive loading on initial load to ensure data displays
            await this.loadData(false, false); // Force fresh load on initial view
            this.isInitialLoad = false;
        } else {
            document.getElementById('nav-donations').classList.add('active');
            document.getElementById('casualty-view').classList.add('hidden');
            document.querySelector('.main-section').classList.add('hidden');
            document.getElementById('donation-view').classList.remove('hidden');
        }
    }

    // Handle tab switching
    handleTabClick(event) {
        const region = event.target.dataset.region;
        if (!region || region === uiManager.getCurrentRegion()) return;

        this.switchRegion(region);
    }

    // Handle visibility change for auto-refresh
    handleVisibilityChange() {
        if (!document.hidden && this.currentView === 'casualty') {
            // Page became visible and we're on casualty view, refresh data
            this.handleRefresh();
        }
    }

    // Handle manual refresh
    async handleRefresh() {
        if (this.currentView === 'casualty') {
            await this.loadData(true, false); // Force refresh without progressive loading
        }
    }

    // Switch to a different region
    async switchRegion(region) {
        if (!CONFIG.REGIONS[region]) {
            console.error('Invalid region:', region);
            return;
        }

        uiManager.setRegion(region);

        // Update display with existing data or load new data
        if (this.casualtiesData[region].length > 0) {
            this.updateDisplayForRegion(region);
        } else {
            await this.loadRegionData(region);
        }
    }

            // Load data for all regions with progressive loading option
    async loadData(isRefresh = false, useProgressiveLoading = true) {
        // Show loading only if we don't have any cached data to show
        const hasAnyData = this.casualtiesData.gaza.length > 0 || this.casualtiesData.westbank.length > 0;

        if (!isRefresh) {
            if (!hasAnyData || !useProgressiveLoading) {
                uiManager.showLoading(false); // Loading fresh data
            } else if (hasAnyData && useProgressiveLoading) {
                uiManager.showLoading(true); // Showing cached data
            }
        }

        try {
            const results = await apiClient.loadAllData(useProgressiveLoading && !isRefresh);

            let hasAnyDataLoaded = false;
            let hasAnyChanges = false;

            // Process Gaza data
            if (results.gaza.success && results.gaza.data && results.gaza.data.length > 0) {
                this.casualtiesData.gaza = results.gaza.data;
                hasAnyDataLoaded = true;
                if (results.gaza.hasChanged) {
                    hasAnyChanges = true;
                }
            } else {
                console.error('Gaza data load failed:', results.gaza.error || 'No data returned');
            }

            // Process West Bank data
            if (results.westbank.success && results.westbank.data && results.westbank.data.length > 0) {
                this.casualtiesData.westbank = results.westbank.data;
                hasAnyDataLoaded = true;
                if (results.westbank.hasChanged) {
                    hasAnyChanges = true;
                }
            } else {
                console.error('West Bank data load failed:', results.westbank.error || 'No data returned');
            }

            if (!hasAnyDataLoaded) {
                throw new Error('Failed to load data from all sources');
            }

            // Update display for current region
            this.updateDisplayForRegion(uiManager.getCurrentRegion());

            // Show notification if data changed during refresh
            if (isRefresh && hasAnyChanges) {
                uiManager.showUpdateNotification();
            }

            this.retryCount = 0; // Reset retry count on success

        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleLoadError(error, isRefresh);
        } finally {
            // Always hide loading state
            uiManager.hideLoading();
        }
    }

    // Load data for a specific region
    async loadRegionData(region) {
        uiManager.showLoading();

        try {
            const result = await apiClient.loadRegionData(region);

            if (result.success) {
                this.casualtiesData[region] = result.data;
                this.updateDisplayForRegion(region);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error(`Failed to load ${region} data:`, error);
            uiManager.showError(error.message);
        } finally {
            uiManager.hideLoading();
        }
    }

        // Update display for a specific region
    updateDisplayForRegion(region) {
        const data = this.casualtiesData[region];

        if (!data || data.length === 0) {
            console.warn(`No data available for region: ${region}`);
            return;
        }

        // Update UI components
        uiManager.updateHeroDisplay(data);
        uiManager.updateMainDisplay(data);

        // Update chart
        chartManager.updateChart(data, region);
    }

    // Handle load errors with retry logic
    handleLoadError(error, isRefresh) {
        this.retryCount++;
        const maxRetries = 3;

        if (this.retryCount <= maxRetries && !isRefresh) {
            console.log(`Retrying data load (attempt ${this.retryCount}/${maxRetries})...`);
            setTimeout(() => this.loadData(), 2000 * this.retryCount);
        } else {
            uiManager.showError(error.message || 'Failed to load data. Please check your connection and try again.');
        }
    }

    // Setup auto-refresh
    setupAutoRefresh() {
        const refreshInterval = () => {
            if (!document.hidden && this.currentView === 'casualty') {
                this.handleRefresh();
            }
            this.refreshTimeoutId = setTimeout(refreshInterval, CONFIG.REFRESH.interval);
        };

        this.refreshTimeoutId = setTimeout(refreshInterval, CONFIG.REFRESH.interval);
    }

    // Setup pull-to-refresh functionality
    setupPullToRefresh() {
        const pullToRefreshElement = document.getElementById('pullToRefresh');
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        const onTouchStart = (e) => {
            if (window.scrollY === 0 && this.currentView === 'casualty') {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        };

        const onTouchMove = (e) => {
            if (!isPulling) return;

            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 0) {
                e.preventDefault();
                const pullThreshold = 100;
                const opacity = Math.min(pullDistance / pullThreshold, 1);

                pullToRefreshElement.style.opacity = opacity;
                pullToRefreshElement.classList.add('visible');

                if (pullDistance > pullThreshold) {
                    pullToRefreshElement.classList.add('active');
                } else {
                    pullToRefreshElement.classList.remove('active');
                }
            }
        };

        const onTouchEnd = async () => {
            if (!isPulling) return;

            isPulling = false;
            const pullDistance = currentY - startY;

            if (pullDistance > 100) {
                pullToRefreshElement.classList.add('refreshing');
                await this.handleRefresh();
            }

            this.resetPullToRefresh();
        };

        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }

    // Reset pull-to-refresh state
    resetPullToRefresh() {
        const pullToRefreshElement = document.getElementById('pullToRefresh');
        setTimeout(() => {
            pullToRefreshElement.classList.remove('visible', 'active', 'refreshing');
            pullToRefreshElement.style.opacity = '0';
        }, 500);
    }

    // Clear cached data
    clearCache() {
        Object.keys(CONFIG.REGIONS).forEach(region => {
            localStorage.removeItem(`${CONFIG.CACHE.key}_${region}`);
        });
        // Also clear view preference
        localStorage.removeItem('selectedView');
        localStorage.removeItem('selectedRegion');
    }

    // Cleanup on app destroy
    destroy() {
        if (this.refreshTimeoutId) {
            clearTimeout(this.refreshTimeoutId);
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        document.querySelectorAll('.nav-button').forEach(button => {
            button.removeEventListener('click', this.handleNavClick);
        });

        document.querySelectorAll('.hero-tab-button, .tab-button').forEach(button => {
            button.removeEventListener('click', this.handleTabClick);
        });
    }
}

// Create and initialize the app
const app = new App();

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Export for debugging
window.app = app;
