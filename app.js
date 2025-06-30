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
        this.selectedDate = null;
        this.selectedDateData = null;

        this.currentView = localStorage.getItem('selectedView') || 'casualty';

        this.handleTabClick = this.handleTabClick.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleRefresh = debounce(this.handleRefresh.bind(this), 1000);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.handleDataUpdate = this.handleDataUpdate.bind(this);
        this.handleDateSelection = this.handleDateSelection.bind(this);
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            uiManager.initialize();

            const chartCanvas = document.querySelector('#casualtiesChart');
            chartManager.initialize(chartCanvas);

            this.setupEventListeners();

            await this.switchView(this.currentView);

            this.setupAutoRefresh();
            this.setupPullToRefresh();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize application:', error);
            uiManager.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', this.handleNavClick);
        });

        document.querySelectorAll('.hero-tab-button, .tab-button').forEach(button => {
            button.addEventListener('click', this.handleTabClick);
        });

        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        window.addEventListener('focus', () => {
            if (!document.hidden) {
                this.handleRefresh();
            }
        });

        window.addEventListener('dataUpdated', this.handleDataUpdate);
        window.addEventListener('dateSelected', this.handleDateSelection);

        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', this.handleScrollIndicatorClick.bind(this));
            scrollIndicator.style.cursor = 'pointer';
        }

        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    async handleDataUpdate(event) {
        const { region } = event.detail;

        try {
            const result = await apiClient.loadRegionData(region, false);
            if (result.success) {
                this.casualtiesData[region] = result.data;

                if (region === uiManager.getCurrentRegion()) {
                    this.updateDisplayForRegion(region);

                    if (result.hasChanged) {
                        uiManager.showUpdateNotification();
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to update ${region} data:`, error);
        }
    }

    async handleNavClick(event) {
        const buttonId = event.target.id;
        const newView = (buttonId === 'nav-casualty-data' || buttonId === 'nav-casualty-data-mobile') ? 'casualty' : 'donation';

        if (newView === this.currentView) return;

        await this.switchView(newView);
    }

    async switchView(view) {
        this.currentView = view;

        localStorage.setItem('selectedView', view);

        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });

        if (view === 'casualty') {
            document.getElementById('nav-casualty-data').classList.add('active');
            document.getElementById('nav-casualty-data-mobile').classList.add('active');
            document.getElementById('casualty-view').classList.remove('hidden');
            document.querySelector('.main-section').classList.remove('hidden');
            document.getElementById('donation-view').classList.add('hidden');

            await this.loadData(false, false);
            this.isInitialLoad = false;
        } else {
            document.getElementById('nav-donations').classList.add('active');
            document.getElementById('nav-donations-mobile').classList.add('active');
            document.getElementById('casualty-view').classList.add('hidden');
            document.querySelector('.main-section').classList.add('hidden');
            document.getElementById('donation-view').classList.remove('hidden');
        }

        // Scroll to top when switching views
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    handleTabClick(event) {
        const region = event.target.dataset.region;
        if (!region || region === uiManager.getCurrentRegion()) return;

        this.switchRegion(region);
    }

    handleVisibilityChange() {
        if (!document.hidden && this.currentView === 'casualty') {
            this.handleRefresh();
        }
    }

    async handleRefresh() {
        if (this.currentView === 'casualty') {
            if (this.selectedDate) {
                await this.loadDataForDate(this.selectedDate);
            } else {
                await this.loadData(true, false);
            }
        }
    }

    async switchRegion(region) {
        if (!CONFIG.REGIONS[region]) {
            console.error('Invalid region:', region);
            return;
        }

        uiManager.setRegion(region);

        if (this.selectedDate) {
            await this.loadDataForDate(this.selectedDate);
        } else {
            if (this.casualtiesData[region].length > 0) {
                this.updateDisplayForRegion(region);
            } else {
                await this.loadRegionData(region);
            }
        }
    }

    async loadData(isRefresh = false, useProgressiveLoading = true) {
        const hasAnyData = this.casualtiesData.gaza.length > 0 || this.casualtiesData.westbank.length > 0;

        if (!isRefresh) {
            if (!hasAnyData || !useProgressiveLoading) {
                uiManager.showLoading(false);
            } else if (hasAnyData && useProgressiveLoading) {
                uiManager.showLoading(true);
            }
        }

        try {
            const results = await apiClient.loadAllData(useProgressiveLoading && !isRefresh);

            let hasAnyDataLoaded = false;
            let hasAnyChanges = false;

            if (results.gaza.success && results.gaza.data && results.gaza.data.length > 0) {
                this.casualtiesData.gaza = results.gaza.data;
                hasAnyDataLoaded = true;
                if (results.gaza.hasChanged) {
                    hasAnyChanges = true;
                }
            } else {
                console.error('Gaza data load failed:', results.gaza.error || 'No data returned');
            }

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

            this.updateDisplayForRegion(uiManager.getCurrentRegion());

            if (isRefresh && hasAnyChanges) {
                uiManager.showUpdateNotification();
            }

            this.retryCount = 0;

        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleLoadError(error, isRefresh);
        } finally {
            uiManager.hideLoading();
        }
    }

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

    updateDisplayForRegion(region) {
        const data = this.casualtiesData[region];

        if (!data || data.length === 0) {
            console.warn(`No data available for region: ${region}`);
            return;
        }

        uiManager.updateHeroDisplay(data);
        uiManager.updateMainDisplay(data);
        uiManager.updateButtonsForRegionData(data);
        chartManager.updateChart(data, region, this.selectedDate);
    }

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

    setupAutoRefresh() {
        const refreshInterval = () => {
            if (!document.hidden && this.currentView === 'casualty') {
                this.handleRefresh();
            }
            this.refreshTimeoutId = setTimeout(refreshInterval, CONFIG.REFRESH.interval);
        };

        this.refreshTimeoutId = setTimeout(refreshInterval, CONFIG.REFRESH.interval);
    }

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

    resetPullToRefresh() {
        const pullToRefreshElement = document.getElementById('pullToRefresh');
        setTimeout(() => {
            pullToRefreshElement.classList.remove('visible', 'active', 'refreshing');
            pullToRefreshElement.style.opacity = '0';
        }, 500);
    }

    handleScrollIndicatorClick() {
        const mainSection = document.querySelector('.main-section');
        if (mainSection) {
            mainSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    clearCache() {
        Object.keys(CONFIG.REGIONS).forEach(region => {
            localStorage.removeItem(`${CONFIG.CACHE.key}_${region}`);
        });
        localStorage.removeItem('selectedView');
        localStorage.removeItem('selectedRegion');
    }

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

    async handleDateSelection(event) {
        const { date } = event.detail;
        this.selectedDate = date;

        await this.loadDataForDate(date);
    }

    async loadDataForDate(date) {
        if (this.currentView !== 'casualty') return;

        try {
            uiManager.showLoading(false);

            const currentRegion = uiManager.getCurrentRegion();

            if (!this.casualtiesData[currentRegion] || this.casualtiesData[currentRegion].length === 0) {
                await this.loadRegionData(currentRegion);
            }

            const result = await apiClient.loadRegionDataForDate(currentRegion, date);

            if (result.success) {
                this.selectedDateData = result.data;

                uiManager.updateHeroDisplay(result.data);
                uiManager.updateMainDisplay(result.data);
                chartManager.updateChart(this.casualtiesData[currentRegion], currentRegion, this.selectedDate);

                if (result.isClosestDate) {
                    this.showDateNotification(`Data for ${date} not available. Showing closest date: ${result.actualDate}`);
                }
            } else {
                this.handleLoadError(new Error(result.error), false);
            }
        } catch (error) {
            console.error('Failed to load data for date:', error);
            this.handleLoadError(error, false);
        } finally {
            uiManager.hideLoading();
        }
    }

    showDateNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'date-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 165, 0, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: Inter, sans-serif;
            font-size: 0.9rem;
            max-width: 90vw;
            text-align: center;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    resetToCurrentDate() {
        this.selectedDate = null;
        this.selectedDateData = null;
        this.handleRefresh();
    }

    isShowingHistoricalData() {
        return this.selectedDate !== null;
    }
}

const app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

window.app = app;
