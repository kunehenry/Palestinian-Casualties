import { CONFIG } from './config.js';
import { formatNumber, formatNumberWithNoData, formatDate, getSourceName, safeQuerySelector, safeQuerySelectorAll, getLatestDataEntry } from './utils.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.currentRegion = CONFIG.DEFAULT_REGION;
        this.isLoading = false;
        this.chart = null;
        this.initializeElements();
    }

    // Initialize DOM element references
    initializeElements() {
        this.elements = {
            // Hero section
            heroDate: safeQuerySelector('#hero-date'),
            heroDailyKilled: safeQuerySelector('#hero-daily-killed'),
            heroDailyInjured: safeQuerySelector('#hero-daily-injured'),
            heroDataSource: safeQuerySelector('#hero-data-source'),
            heroContent: safeQuerySelector('#hero-content'),
            heroLoading: safeQuerySelector('#hero-loading'),
            heroTabButtons: safeQuerySelectorAll('.hero-tab-button'),

            // Main content
            mainContent: safeQuerySelector('#main-content'),
            currentRegion: safeQuerySelector('#current-region'),
            latestDate: safeQuerySelector('#latest-date'),
            dataSource: safeQuerySelector('#data-source'),
            lastUpdated: safeQuerySelector('#last-updated'),

            // Statistics
            totalKilled: safeQuerySelector('#total-killed'),
            totalInjured: safeQuerySelector('#total-injured'),
            childrenKilled: safeQuerySelector('#children-killed'),
            womenKilled: safeQuerySelector('#women-killed'),
            medicalKilled: safeQuerySelector('#medical-killed'),
            pressKilled: safeQuerySelector('#press-killed'),
            settlerAttacks: safeQuerySelector('#settler-attacks'),

            // Cards and sections
            professionalsCard: safeQuerySelector('#professionals-card'),
            settlerAttacksCard: safeQuerySelector('#settler-attacks-card'),
            gazaInfo: safeQuerySelector('#gaza-info'),
            westbankInfo: safeQuerySelector('#westbank-info'),

            // Chart
            chartCanvas: safeQuerySelector('#casualtiesChart'),

            // Loading and error
            loading: safeQuerySelector('#loading')
        };
    }

    // Set current region and update UI
    setRegion(region) {
        if (region === this.currentRegion) return;

        this.currentRegion = region;
        localStorage.setItem('selectedRegion', region);

        this.updateRegionUI();
    }

    // Update UI elements based on current region
    updateRegionUI() {
        const regionConfig = CONFIG.REGIONS[this.currentRegion];

        // Update tab buttons
        this.updateTabButtons();

        // Update region label
        if (this.elements.currentRegion) {
            this.elements.currentRegion.textContent = regionConfig.name;
        }

        // Toggle region-specific elements
        this.toggleRegionElements();
    }

    // Update active state of tab buttons
    updateTabButtons() {
        this.elements.heroTabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === this.currentRegion);
        });

        safeQuerySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === this.currentRegion);
        });
    }

    // Toggle visibility of region-specific elements
    toggleRegionElements() {
        const regionConfig = CONFIG.REGIONS[this.currentRegion];

        // Professional card visibility
        if (this.elements.professionalsCard) {
            this.elements.professionalsCard.classList.toggle('hidden', !regionConfig.hasProfessionals);
        }

        // Settler attacks card visibility
        if (this.elements.settlerAttacksCard) {
            this.elements.settlerAttacksCard.classList.toggle('hidden', !regionConfig.hasSettlerAttacks);
        }

        // Info sections
        if (this.elements.gazaInfo) {
            this.elements.gazaInfo.classList.toggle('hidden', this.currentRegion !== 'gaza');
        }

        if (this.elements.westbankInfo) {
            this.elements.westbankInfo.classList.toggle('hidden', this.currentRegion !== 'westbank');
        }
    }

    // Update hero section display
        updateHeroDisplay(data) {
        if (!data || data.length === 0) return;

        const latest = getLatestDataEntry(data);
        if (!latest) return;

        // Use daily values from API data
        const dailyKilled = latest.daily_killed || 0;
        const dailyInjured = latest.daily_injured || 0;

        // Update hero elements safely
        this.updateElement(this.elements.heroDate, formatDate(latest.date));
        this.updateElement(this.elements.heroDailyKilled, formatNumber(dailyKilled));
        this.updateElement(this.elements.heroDailyInjured, formatNumber(dailyInjured));
        this.updateElement(this.elements.heroDataSource, getSourceName(latest.source, this.currentRegion));

        // Show hero content (remove hidden class)
        if (this.elements.heroContent) {
            this.elements.heroContent.classList.remove('hidden');
        }
    }

        // Update main content display
    updateMainDisplay(data) {
        if (!data || data.length === 0) return;

        const latest = getLatestDataEntry(data);
        if (!latest) return;

        // Update date and source
        this.updateElement(this.elements.latestDate, formatDate(latest.date));
        this.updateElement(this.elements.dataSource, getSourceName(latest.source, this.currentRegion));

        // Update statistics based on region
        if (this.currentRegion === 'gaza') {
            this.updateGazaStats(latest);
        } else {
            this.updateWestBankStats(latest);
        }

        // Update last updated time
        this.updateElement(this.elements.lastUpdated, new Date().toLocaleString());

        // Show main content (remove hidden class)
        if (this.elements.mainContent) {
            this.elements.mainContent.classList.remove('hidden');
        }
    }

    // Update Gaza-specific statistics
    updateGazaStats(latest) {
        const updates = {
            totalKilled: latest.killed,
            totalInjured: latest.injured,
            childrenKilled: latest.children_killed,
            womenKilled: latest.women_killed,
            medicalKilled: latest.medical_killed,
            pressKilled: latest.press_killed
        };

        this.updateStatElements(updates);
    }

    // Update West Bank-specific statistics
    updateWestBankStats(latest) {
        const updates = {
            totalKilled: latest.killed,
            totalInjured: latest.injured,
            childrenKilled: latest.children_killed,
            settlerAttacks: latest.settler_attacks
        };

        this.updateStatElements(updates);
    }

    // Helper method to update multiple stat elements
    updateStatElements(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.updateElement(this.elements[key], formatNumber(value));
        });
    }

        // Helper method to safely update an element's text content
    updateElement(element, content) {
        if (element && content !== undefined) {
            element.textContent = content;
        }
    }

    // Show loading state with optional cache indicator
    showLoading(isFromCache = false) {
        const loadingElement = document.getElementById('loading');
        const heroSection = document.querySelector('.hero-section');
        const mainSection = document.querySelector('.main-section');

        if (loadingElement) {
            if (!isFromCache) {
                loadingElement.classList.remove('hidden');
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading latest data...</div>
                `;
            } else {
                // For cached data, show a subtle indicator
                loadingElement.innerHTML = `
                    <div class="loading-text" style="opacity: 0.7; font-size: 0.9rem;">
                        Showing cached data • Checking for updates...
                    </div>
                `;
                loadingElement.classList.remove('hidden');

                // Auto-hide this message after a short time
                setTimeout(() => {
                    if (loadingElement) {
                        loadingElement.classList.add('hidden');
                    }
                }, 2000);
            }
        }

        // Add subtle loading state to sections when showing cached data
        if (isFromCache) {
            if (heroSection) heroSection.classList.add('loading-cached');
            if (mainSection) mainSection.classList.add('loading-cached');
        } else {
            if (heroSection) heroSection.classList.add('loading');
            if (mainSection) mainSection.classList.add('loading');
        }
    }

    // Hide loading state
    hideLoading() {
        const loadingElement = document.getElementById('loading');
        const heroSection = document.querySelector('.hero-section');
        const mainSection = document.querySelector('.main-section');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }

        // Remove loading states from sections
        if (heroSection) {
            heroSection.classList.remove('loading', 'loading-cached');
        }
        if (mainSection) {
            mainSection.classList.remove('loading', 'loading-cached');
        }
    }

    // Show error message
    showError(message) {
        console.error('UI Error:', message);

        // Hide loading states
        this.hideLoading();

        // Create error message element if it doesn't exist
        let errorElement = document.querySelector('.error-message');

        if (!errorElement) {
            errorElement = this.createErrorElement(message);
            document.body.appendChild(errorElement);
        } else {
            errorElement.querySelector('p').textContent = message;
            errorElement.classList.remove('hidden');
        }

        // Auto-hide error after configured time
        setTimeout(() => {
            if (errorElement) {
                errorElement.classList.add('hidden');
            }
        }, CONFIG.UI.errorDisplayTime);
    }

    // Create error message element
    createErrorElement(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <h3>Unable to Load Data</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()">Refresh Page</button>
        `;
        return errorElement;
    }

    // Show update notification
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.textContent = 'Data updated with latest information';

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove notification after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get current region
    getCurrentRegion() {
        return this.currentRegion;
    }

    // Initialize UI manager
    initialize() {
        // Restore saved region from localStorage
        const savedRegion = localStorage.getItem('selectedRegion');
        if (savedRegion && CONFIG.REGIONS[savedRegion]) {
            this.currentRegion = savedRegion;
        }

        this.updateRegionUI();
    }
}

export default new UIManager();
