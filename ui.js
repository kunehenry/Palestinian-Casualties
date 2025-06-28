import { CONFIG } from './config.js';
import { formatNumber, formatNumberWithNoData, formatDate, getSourceName, safeQuerySelector, safeQuerySelectorAll, getLatestDataEntry } from './utils.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.currentRegion = CONFIG.DEFAULT_REGION;
        this.isLoading = false;
        this.chart = null;
        this.displayedDate = null; // Track the currently displayed date
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

            // Date picker
            datePickerOverlay: safeQuerySelector('#date-picker-overlay'),
            dateInput: safeQuerySelector('#date-input'),
            quickDateButtons: safeQuerySelector('#quick-date-buttons'),
            closeDatePicker: safeQuerySelector('#close-date-picker'),
            cancelDatePicker: safeQuerySelector('#cancel-date-picker'),
            applyDatePicker: safeQuerySelector('#apply-date-picker'),

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
        // Update date button states for the new region
        this.updateDateButtonStates();
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

        // Store the displayed date
        this.displayedDate = latest.date;

        // Use daily values from API data
        const dailyKilled = latest.daily_killed || 0;
        const dailyInjured = latest.daily_injured || 0;

        // Update hero elements safely
        this.updateElement(this.elements.heroDate, formatDate(latest.date));
        this.updateElement(this.elements.heroDailyKilled, formatNumber(dailyKilled));
        this.updateElement(this.elements.heroDailyInjured, formatNumber(dailyInjured));
        this.updateElement(this.elements.heroDataSource, '');

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

        // Store the displayed date (if not already set by hero display)
        if (!this.displayedDate) {
            this.displayedDate = latest.date;
        }

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
        this.currentRegion = localStorage.getItem('selectedRegion') || CONFIG.DEFAULT_REGION;
        this.setupDatePicker();
        this.updateRegionUI();
    }

    // Setup date picker functionality
    setupDatePicker() {
        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.dateInput) {
            this.elements.dateInput.max = today;
        }

        // Generate quick date buttons
        this.generateQuickDateButtons();

        // Add click listener to date display
        if (this.elements.heroDate) {
            this.elements.heroDate.addEventListener('click', () => {
                this.showDatePicker();
            });
        }

        // Add date input change listener
        if (this.elements.dateInput) {
            this.elements.dateInput.addEventListener('change', () => {
                this.updateQuickDateSelection();
            });
        }

        // Add close listeners
        if (this.elements.closeDatePicker) {
            this.elements.closeDatePicker.addEventListener('click', () => {
                this.hideDatePicker();
            });
        }

        if (this.elements.cancelDatePicker) {
            this.elements.cancelDatePicker.addEventListener('click', () => {
                this.hideDatePicker();
            });
        }

        // Add apply listener
        if (this.elements.applyDatePicker) {
            this.elements.applyDatePicker.addEventListener('click', () => {
                this.handleDateSelection();
            });
        }

        // Close on overlay click
        if (this.elements.datePickerOverlay) {
            this.elements.datePickerOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.datePickerOverlay) {
                    this.hideDatePicker();
                }
            });
        }

        // Handle ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDatePickerVisible()) {
                this.hideDatePicker();
            }
        });
    }

    // Generate quick date buttons for last 7 days
    generateQuickDateButtons() {
        if (!this.elements.quickDateButtons) return;

        const today = new Date();
        const buttons = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const dateStr = date.toISOString().split('T')[0];
            const label = i === 0 ? 'Today' :
                         i === 1 ? 'Yesterday' :
                         `${i} days ago`;

            const button = document.createElement('button');
            button.className = 'quick-date-btn';
            button.textContent = label;
            button.dataset.date = dateStr;
            button.dataset.isToday = (i === 0).toString();

            button.addEventListener('click', () => {
                // Don't allow selection if button is disabled
                if (button.disabled || button.classList.contains('disabled')) {
                    return;
                }
                this.selectQuickDate(dateStr);
            });

            buttons.push(button);
        }

        // Clear existing buttons and add new ones
        this.elements.quickDateButtons.innerHTML = '';
        buttons.forEach(button => {
            this.elements.quickDateButtons.appendChild(button);
        });

        // Update button states based on data availability
        this.updateDateButtonStates();
    }

    // Handle quick date selection
    selectQuickDate(dateStr) {
        // Update date input
        if (this.elements.dateInput) {
            this.elements.dateInput.value = dateStr;
        }

        // Update button selection
        this.updateQuickDateSelection();
    }

    // Update quick date button selection based on current date input
    updateQuickDateSelection() {
        if (!this.elements.quickDateButtons || !this.elements.dateInput) return;

        const selectedDate = this.elements.dateInput.value;
        const buttons = this.elements.quickDateButtons.querySelectorAll('.quick-date-btn');

        buttons.forEach(button => {
            if (button.dataset.date === selectedDate) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    }

    // Show date picker modal
    showDatePicker() {
        if (!this.elements.datePickerOverlay) return;

        // Set current date as default
        const currentDate = this.getCurrentDisplayedDate();
        if (currentDate && this.elements.dateInput) {
            this.elements.dateInput.value = currentDate;
        }

        // Regenerate quick date buttons to ensure they're up to date
        this.generateQuickDateButtons();

        // Update quick date button selection
        this.updateQuickDateSelection();

        this.elements.datePickerOverlay.classList.remove('hidden');
        setTimeout(() => {
            this.elements.datePickerOverlay.classList.add('visible');
        }, 10);

        // Focus on date input
        if (this.elements.dateInput) {
            this.elements.dateInput.focus();
        }
    }

    // Hide date picker modal
    hideDatePicker() {
        if (!this.elements.datePickerOverlay) return;

        this.elements.datePickerOverlay.classList.remove('visible');
        setTimeout(() => {
            this.elements.datePickerOverlay.classList.add('hidden');
        }, 300);
    }

    // Check if date picker is visible
    isDatePickerVisible() {
        return this.elements.datePickerOverlay &&
               this.elements.datePickerOverlay.classList.contains('visible');
    }

    // Handle date selection
    handleDateSelection() {
        if (!this.elements.dateInput) return;

        const selectedDate = this.elements.dateInput.value;
        if (!selectedDate) return;

        // Emit event for app to handle
        window.dispatchEvent(new CustomEvent('dateSelected', {
            detail: { date: selectedDate }
        }));

        this.hideDatePicker();
    }

    // Get currently displayed date in YYYY-MM-DD format
    getCurrentDisplayedDate() {
        // Return the actual displayed date if available, otherwise today's date
        if (this.displayedDate) {
            return this.displayedDate;
        }

        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // Check if data is available for a specific date in the current region
    isDataAvailableForDate(dateStr, regionData) {
        if (!regionData || !Array.isArray(regionData) || regionData.length === 0) {
            return false;
        }

        return regionData.some(entry => {
            return entry.report_date === dateStr || entry.date === dateStr;
        });
    }

        // Update date button states based on data availability
    updateDateButtonStates(regionData = null) {
        if (!this.elements.quickDateButtons) return;

        // If no region data provided, try to get it from the app
        if (!regionData && window.app && window.app.casualtiesData) {
            regionData = window.app.casualtiesData[this.currentRegion];
        }

        const buttons = this.elements.quickDateButtons.querySelectorAll('.quick-date-btn');

        buttons.forEach(button => {
            const dateStr = button.dataset.date;
            const isToday = button.dataset.isToday === 'true';

            if (isToday) {
                if (regionData && regionData.length > 0) {
                    const isAvailable = this.isDataAvailableForDate(dateStr, regionData);

                    if (isAvailable) {
                        button.disabled = false;
                        button.classList.remove('disabled');
                    } else {
                        button.disabled = true;
                        button.classList.add('disabled');
                    }
                } else {
                    // No data available, disable the Today button
                    button.disabled = true;
                    button.classList.add('disabled');
                }
            }
        });
    }

    // Update button states when region data changes
    updateButtonsForRegionData(regionData) {
        this.updateDateButtonStates(regionData);
    }
}

export default new UIManager();
