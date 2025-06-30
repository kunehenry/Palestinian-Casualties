import { CONFIG } from './config.js';
import { formatNumber, formatNumberWithNoData, formatDate, getSourceName, safeQuerySelector, safeQuerySelectorAll, getLatestDataEntry } from './utils.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.currentRegion = CONFIG.DEFAULT_REGION;
        this.isLoading = false;
        this.chart = null;
        this.displayedDate = null;
        this.lastScrollY = 0;
        this.isScrollingDown = false;
        this.scrollThreshold = 100;
        this.initializeElements();
    }

    initializeElements() {
        this.elements = {
            // Navigation
            navBar: safeQuerySelector('#nav-bar'),
            hamburgerMenu: safeQuerySelector('#hamburger-menu'),
            navDropdown: safeQuerySelector('#nav-dropdown'),
            navCasualtyData: safeQuerySelector('#nav-casualty-data'),
            navDonations: safeQuerySelector('#nav-donations'),
            navCasualtyDataMobile: safeQuerySelector('#nav-casualty-data-mobile'),
            navDonationsMobile: safeQuerySelector('#nav-donations-mobile'),

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
            loading: safeQuerySelector('#loading'),

            // Scroll indicator
            scrollIndicator: safeQuerySelector('.scroll-indicator')
        };
    }

    setRegion(region) {
        if (region === this.currentRegion) return;

        this.currentRegion = region;
        localStorage.setItem('selectedRegion', region);

        this.updateRegionUI();
        this.updateDateButtonStates();
    }

    updateRegionUI() {
        const regionConfig = CONFIG.REGIONS[this.currentRegion];

        this.updateTabButtons();

        if (this.elements.currentRegion) {
            this.elements.currentRegion.textContent = regionConfig.name;
        }

        this.toggleRegionElements();
    }

    updateTabButtons() {
        this.elements.heroTabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === this.currentRegion);
        });

        safeQuerySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === this.currentRegion);
        });
    }

    toggleRegionElements() {
        const regionConfig = CONFIG.REGIONS[this.currentRegion];

        if (this.elements.professionalsCard) {
            this.elements.professionalsCard.classList.toggle('hidden', !regionConfig.hasProfessionals);
        }

        if (this.elements.settlerAttacksCard) {
            this.elements.settlerAttacksCard.classList.toggle('hidden', !regionConfig.hasSettlerAttacks);
        }

        if (this.elements.gazaInfo) {
            this.elements.gazaInfo.classList.toggle('hidden', this.currentRegion !== 'gaza');
        }

        if (this.elements.westbankInfo) {
            this.elements.westbankInfo.classList.toggle('hidden', this.currentRegion !== 'westbank');
        }
    }

    updateHeroDisplay(data) {
        if (!data || data.length === 0) return;

        const latest = getLatestDataEntry(data);
        if (!latest) return;

        this.displayedDate = latest.date;

        const dailyKilled = latest.daily_killed || 0;
        const dailyInjured = latest.daily_injured || 0;

        this.updateElement(this.elements.heroDate, formatDate(latest.date));
        this.updateElement(this.elements.heroDailyKilled, formatNumber(dailyKilled));
        this.updateElement(this.elements.heroDailyInjured, formatNumber(dailyInjured));
        this.updateElement(this.elements.heroDataSource, '');

        if (this.elements.heroContent) {
            this.elements.heroContent.classList.remove('hidden');
        }
    }

    updateMainDisplay(data) {
        if (!data || data.length === 0) return;

        const latest = getLatestDataEntry(data);
        if (!latest) return;

        if (!this.displayedDate) {
            this.displayedDate = latest.date;
        }

        this.updateElement(this.elements.latestDate, formatDate(latest.date));
        this.updateElement(this.elements.dataSource, getSourceName(latest.source, this.currentRegion));

        if (this.currentRegion === 'gaza') {
            this.updateGazaStats(latest);
        } else {
            this.updateWestBankStats(latest);
        }

        this.updateElement(this.elements.lastUpdated, new Date().toLocaleString());

        if (this.elements.mainContent) {
            this.elements.mainContent.classList.remove('hidden');
        }
    }

    updateGazaStats(latest) {
        const STALE_CHILDREN_VALUE = 18000;
        const STALE_WOMEN_VALUE = 12400;
        const STALE_DATA_DATE = '2025-04-18';

        const isChildrenDataStale = latest.children_killed === STALE_CHILDREN_VALUE;
        const isWomenDataStale = latest.women_killed === STALE_WOMEN_VALUE;

        const updates = {
            totalKilled: latest.killed,
            totalInjured: latest.injured,
            medicalKilled: latest.medical_killed,
            pressKilled: latest.press_killed
        };

        this.updateStatElements(updates);

        this.updateDemographicField(
            this.elements.childrenKilled,
            latest.children_killed,
            isChildrenDataStale,
            'children',
            STALE_DATA_DATE
        );

        this.updateDemographicField(
            this.elements.womenKilled,
            latest.women_killed,
            isWomenDataStale,
            'women',
            STALE_DATA_DATE
        );
    }

    updateDemographicField(element, value, isStale, fieldName, staleDate) {
        if (!element) return;

        if (isStale) {
            element.textContent = `${formatNumber(value)}+`;
            element.classList.add('stale-data');
            element.setAttribute('data-tooltip', `Estimated minimum - last updated ${staleDate}`);
            element.title = `Estimated minimum - last updated ${staleDate}`;
        } else {
            element.textContent = formatNumber(value);
            element.classList.remove('stale-data');
            element.removeAttribute('data-tooltip');
            element.title = '';
        }
    }

    updateWestBankStats(latest) {
        const updates = {
            totalKilled: latest.killed,
            totalInjured: latest.injured,
            childrenKilled: latest.children_killed,
            settlerAttacks: latest.settler_attacks
        };

        this.updateStatElements(updates);
    }

    updateStatElements(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.updateElement(this.elements[key], formatNumber(value));
        });
    }

    updateElement(element, content) {
        if (element && content !== undefined) {
            element.textContent = content;
        }
    }

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
                loadingElement.innerHTML = `
                    <div class="loading-text" style="opacity: 0.7; font-size: 0.9rem;">
                        Showing cached data • Checking for updates...
                    </div>
                `;
                loadingElement.classList.remove('hidden');

                setTimeout(() => {
                    if (loadingElement) {
                        loadingElement.classList.add('hidden');
                    }
                }, 2000);
            }
        }

        if (isFromCache) {
            if (heroSection) heroSection.classList.add('loading-cached');
            if (mainSection) mainSection.classList.add('loading-cached');
        } else {
            if (heroSection) heroSection.classList.add('loading');
            if (mainSection) mainSection.classList.add('loading');
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        const heroSection = document.querySelector('.hero-section');
        const mainSection = document.querySelector('.main-section');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }

        if (heroSection) {
            heroSection.classList.remove('loading', 'loading-cached');
        }
        if (mainSection) {
            mainSection.classList.remove('loading', 'loading-cached');
        }
    }

    showError(message) {
        console.error('UI Error:', message);

        this.hideLoading();

        let errorElement = document.querySelector('.error-message');

        if (!errorElement) {
            errorElement = this.createErrorElement(message);
            document.body.appendChild(errorElement);
        } else {
            errorElement.querySelector('p').textContent = message;
            errorElement.classList.remove('hidden');
        }

        setTimeout(() => {
            if (errorElement) {
                errorElement.classList.add('hidden');
            }
        }, CONFIG.UI.errorDisplayTime);
    }

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

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.textContent = 'Data updated with latest information';

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getCurrentRegion() {
        return this.currentRegion;
    }

    initialize() {
        this.currentRegion = localStorage.getItem('selectedRegion') || CONFIG.DEFAULT_REGION;
        this.setupDatePicker();
        this.updateRegionUI();
        this.setupScrollIndicator();
        this.setupScrollNavigation();
    }

    setupScrollIndicator() {
        if (!this.elements.scrollIndicator) return;

        const handleScroll = () => {
            const statsSection = document.querySelector('.stats-grid');
            if (!statsSection) {
                this.elements.scrollIndicator.classList.add('visible');
                return;
            }

            const statsRect = statsSection.getBoundingClientRect();
            const isStatsVisible = statsRect.top < window.innerHeight;

            if (isStatsVisible) {
                this.elements.scrollIndicator.classList.remove('visible');
            } else {
                this.elements.scrollIndicator.classList.add('visible');
            }
        };

        const handleClick = () => {
            this.elements.scrollIndicator.classList.remove('visible');

            const targets = [
                document.querySelector('#main-content'),
                document.querySelector('.container'),
                document.querySelector('.main-section'),
                document.querySelector('.stats-grid')
            ];

            const targetElement = targets.find(el => el !== null);

            if (targetElement) {
                const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offset = 500;
                const targetPosition = Math.max(0, elementTop - offset);

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        this.elements.scrollIndicator.addEventListener('click', handleClick);

        this.elements.scrollIndicator.classList.add('visible');

        setTimeout(() => {
            handleScroll();
        }, 100);
    }

    setupDatePicker() {
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.dateInput) {
            this.elements.dateInput.max = today;
        }

        this.generateQuickDateButtons();

        if (this.elements.heroDate) {
            this.elements.heroDate.addEventListener('click', () => {
                this.showDatePicker();
            });
        }

        if (this.elements.dateInput) {
            this.elements.dateInput.addEventListener('change', () => {
                this.updateQuickDateSelection();
            });
        }

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

        if (this.elements.applyDatePicker) {
            this.elements.applyDatePicker.addEventListener('click', () => {
                this.handleDateSelection();
            });
        }

        if (this.elements.datePickerOverlay) {
            this.elements.datePickerOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.datePickerOverlay) {
                    this.hideDatePicker();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDatePickerVisible()) {
                this.hideDatePicker();
            }
        });
    }

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
                if (button.disabled || button.classList.contains('disabled')) {
                    return;
                }
                this.selectQuickDate(dateStr);
            });

            buttons.push(button);
        }

        this.elements.quickDateButtons.innerHTML = '';
        buttons.forEach(button => {
            this.elements.quickDateButtons.appendChild(button);
        });

        this.updateDateButtonStates();
    }

    selectQuickDate(dateStr) {
        if (this.elements.dateInput) {
            this.elements.dateInput.value = dateStr;
        }

        this.updateQuickDateSelection();
    }

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

    showDatePicker() {
        if (!this.elements.datePickerOverlay) return;

        const currentDate = this.getCurrentDisplayedDate();
        if (currentDate && this.elements.dateInput) {
            this.elements.dateInput.value = currentDate;
        }

        this.generateQuickDateButtons();
        this.updateQuickDateSelection();

        this.elements.datePickerOverlay.classList.remove('hidden');
        setTimeout(() => {
            this.elements.datePickerOverlay.classList.add('visible');
        }, 10);

        if (this.elements.dateInput) {
            this.elements.dateInput.focus();
        }
    }

    hideDatePicker() {
        if (!this.elements.datePickerOverlay) return;

        this.elements.datePickerOverlay.classList.remove('visible');
        setTimeout(() => {
            this.elements.datePickerOverlay.classList.add('hidden');
        }, 300);
    }

    isDatePickerVisible() {
        return this.elements.datePickerOverlay &&
               this.elements.datePickerOverlay.classList.contains('visible');
    }

    handleDateSelection() {
        if (!this.elements.dateInput) return;

        const selectedDate = this.elements.dateInput.value;
        if (!selectedDate) return;

        window.dispatchEvent(new CustomEvent('dateSelected', {
            detail: { date: selectedDate }
        }));

        this.hideDatePicker();
    }

    getCurrentDisplayedDate() {
        if (this.displayedDate) {
            return this.displayedDate;
        }

        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    isDataAvailableForDate(dateStr, regionData) {
        if (!regionData || !Array.isArray(regionData) || regionData.length === 0) {
            return false;
        }

        return regionData.some(entry => {
            return entry.report_date === dateStr || entry.date === dateStr;
        });
    }

    updateDateButtonStates(regionData = null) {
        if (!this.elements.quickDateButtons) return;

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
                    button.disabled = true;
                    button.classList.add('disabled');
                }
            }
        });
    }

    updateButtonsForRegionData(regionData) {
        this.updateDateButtonStates(regionData);
    }

    setupScrollNavigation() {
        if (!this.elements.navBar || !this.elements.hamburgerMenu || !this.elements.navDropdown) return;

        let scrollTimeout;
        const handleScroll = () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            scrollTimeout = setTimeout(() => {
                const currentScrollY = window.scrollY;
                const isAtTop = currentScrollY <= 20;
                const shouldCollapse = currentScrollY > this.scrollThreshold;

                if (shouldCollapse && !this.isScrollingDown) {
                    this.isScrollingDown = true;
                    this.updateNavBarState();
                } else if (isAtTop && this.isScrollingDown) {
                    this.isScrollingDown = false;
                    this.updateNavBarState();
                }

                if (currentScrollY > 20) {
                    this.elements.navBar.classList.add('scrolled');
                } else {
                    this.elements.navBar.classList.remove('scrolled');
                }

                this.lastScrollY = currentScrollY;
            }, 10);
        };

        const toggleHamburgerMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isActive = this.elements.hamburgerMenu.classList.contains('active');

            if (isActive) {
                this.closeHamburgerMenu();
            } else {
                this.openHamburgerMenu();
            }
        };

        const handleOutsideClick = (e) => {
            if (!this.elements.navBar.contains(e.target)) {
                this.closeHamburgerMenu();
            }
        };

        const setupMobileNavButtons = () => {
            if (this.elements.navCasualtyDataMobile) {
                this.elements.navCasualtyDataMobile.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.elements.navCasualtyData.click();
                    this.closeHamburgerMenu();
                });
            }

            if (this.elements.navDonationsMobile) {
                this.elements.navDonationsMobile.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.elements.navDonations.click();
                    this.closeHamburgerMenu();
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        if (this.elements.hamburgerMenu) {
            this.elements.hamburgerMenu.addEventListener('click', toggleHamburgerMenu);
        }

        document.addEventListener('click', handleOutsideClick);
        setupMobileNavButtons();

        this.updateNavBarState();
    }

    updateNavBarState() {
        if (!this.elements.navBar) return;

        if (this.isScrollingDown) {
            this.elements.navBar.classList.add('collapsed');
        } else {
            this.elements.navBar.classList.remove('collapsed');
            this.closeHamburgerMenu();
        }
    }

    openHamburgerMenu() {
        if (!this.elements.hamburgerMenu || !this.elements.navDropdown) return;

        this.elements.hamburgerMenu.classList.add('active');
        this.elements.navDropdown.classList.add('active');

        this.syncMobileButtonStates();
    }

    closeHamburgerMenu() {
        if (!this.elements.hamburgerMenu || !this.elements.navDropdown) return;

        this.elements.hamburgerMenu.classList.remove('active');
        this.elements.navDropdown.classList.remove('active');
    }

    syncMobileButtonStates() {
        if (this.elements.navCasualtyData && this.elements.navCasualtyDataMobile) {
            if (this.elements.navCasualtyData.classList.contains('active')) {
                this.elements.navCasualtyDataMobile.classList.add('active');
            } else {
                this.elements.navCasualtyDataMobile.classList.remove('active');
            }
        }

        if (this.elements.navDonations && this.elements.navDonationsMobile) {
            if (this.elements.navDonations.classList.contains('active')) {
                this.elements.navDonationsMobile.classList.add('active');
            } else {
                this.elements.navDonationsMobile.classList.remove('active');
            }
        }
    }
}

export default new UIManager();
