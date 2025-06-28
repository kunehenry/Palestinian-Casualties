import { CONFIG } from './config.js';

// Add performance monitoring near the top of the file
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
        this.enabled = true;
    }

    start(label) {
        if (!this.enabled) return;
        this.timers.set(label, performance.now());
    }

    end(label) {
        if (!this.enabled) return;
        const startTime = this.timers.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            this.timers.delete(label);
            return duration;
        }
    }

    measure(label, fn) {
        this.start(label);
        const result = fn();
        if (result instanceof Promise) {
            return result.finally(() => this.end(label));
        } else {
            this.end(label);
            return result;
        }
    }
}

export const performanceMonitor = new PerformanceMonitor();

// Number formatting utilities
export function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '-';
    if (typeof num === 'string' && num.trim() === '') return '-';

    const number = parseInt(num, 10);
    if (isNaN(number)) return '-';

    return number.toLocaleString();
}

// Format number with option to show "no data available" for zero/missing values
export function formatNumberWithNoData(num, showNoDataForZero = false) {
    if (num === null || num === undefined || num === '') {
        return showNoDataForZero ? 'no data available' : '-';
    }
    if (typeof num === 'string' && num.trim() === '') {
        return showNoDataForZero ? 'no data available' : '-';
    }

    const number = parseInt(num, 10);
    if (isNaN(number)) {
        return showNoDataForZero ? 'no data available' : '-';
    }

    if (number === 0 && showNoDataForZero) {
        return 'no data available';
    }

    return number.toLocaleString();
}

// Date formatting utilities
export function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        // Parse date as local date to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-based in JS

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

// Source name formatting
export function getSourceName(source, region) {
    if (!source) return 'Unknown Source';

    const sourceMap = {
        'gaza_ministry_of_health': 'Gaza Ministry of Health',
        'gaza_government_media_office': 'Gaza Government Media Office',
        'unocha': 'UN OCHA',
        'un_ocha': 'UN OCHA',
        'mohtel': 'Gaza Ministry of Health',
        'gmofp': 'Gaza Government Media Office',
        'gmotel': 'Gaza Government Media Office'
    };

    return sourceMap[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Data validation and transformation utilities
export function validateData(data) {
    if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
    }

    if (data.length === 0) {
        throw new Error('Data array is empty');
    }

    // Transform and validate each data item
    const transformedData = data.map(item => transformDataItem(item));

    // Sort by date to ensure chronological order (latest first)
    return transformedData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
}

// Transform individual data item to standardized format
function transformDataItem(item) {
    return {
        // Keep original fields for reference
        ...item,
        // Map to standardized field names
        date: item.report_date,
        source: item.report_source,
        // Cumulative totals (for total displays)
        killed: item.ext_killed_cum || item.killed_cum || item.killed || 0,
        injured: item.ext_injured_cum || item.injured_cum || item.injured || 0,
        children_killed: item.ext_killed_children_cum || item.killed_children_cum || item.children_killed || 0,
        women_killed: item.ext_killed_women_cum || item.killed_women_cum || item.women_killed || 0,
        medical_killed: item.ext_med_killed_cum || item.med_killed_cum || item.medical_killed || 0,
        press_killed: item.ext_press_killed_cum || item.press_killed_cum || item.press_killed || 0,
        // Daily numbers (for "today" displays)
        daily_killed: item.ext_killed || item.killed || 0,
        daily_injured: item.ext_injured || item.injured || 0,
        settler_attacks: item.settler_attacks_cum || item.settler_attacks || 0
    };
}

// Cache utilities
export function getCachedData(region) {
    try {
        const cacheKey = `${CONFIG.CACHE.key}_${region}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Return fresh cache
        if (now - timestamp < CONFIG.CACHE.expiry) {
            return { data, fresh: true };
        }

        // Return stale cache for background refresh
        if (now - timestamp < CONFIG.CACHE.maxAge) {
            return { data, fresh: false };
        }

        // Expired cache
        localStorage.removeItem(cacheKey);
        return null;
    } catch (error) {
        console.warn('Cache read error:', error);
        return null;
    }
}

export function setCachedData(region, data) {
    try {
        const cacheKey = `${CONFIG.CACHE.key}_${region}`;
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Cache write error:', error);
        // Clear some cache if storage is full
        clearCacheOnError();
    }
}

// Helper function to clear cache when storage is full
function clearCacheOnError() {
    try {
        localStorage.removeItem(`${CONFIG.CACHE.key}_gaza`);
        localStorage.removeItem(`${CONFIG.CACHE.key}_westbank`);
    } catch (e) {
        console.warn('Failed to clear cache:', e);
    }
}

// Get the latest data entry by date (not just last array item)
export function getLatestDataEntry(data) {
    if (!data || data.length === 0) return null;

    // Find the entry with the most recent date
    const latest = data.reduce((latest, current) => {
        const currentDate = new Date(current.date);
        const latestDate = new Date(latest.date);
        return currentDate > latestDate ? current : latest;
    });

    return latest;
}

// Data hashing for change detection
export function hashData(data, region) {
    if (!data || data.length === 0) return null;

    const latest = getLatestDataEntry(data);
    const hashString = `${region}_${latest.date}_${latest.killed || 0}_${latest.injured || 0}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
        const char = hashString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString();
}

// DOM utilities
export function safeQuerySelector(selector, required = false) {
    const element = document.querySelector(selector);
    if (required && !element) {
        throw new Error(`Required element not found: ${selector}`);
    }
    return element;
}

export function safeQuerySelectorAll(selector) {
    return document.querySelectorAll(selector);
}

// Function utilities
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Error handling utilities
export function createErrorMessage(error, context = '') {
    const prefix = context ? `${context}: ` : '';

    if (error.name === 'AbortError') {
        return `${prefix}Request cancelled`;
    }

    if (error.message) {
        return `${prefix}${error.message}`;
    }

    return `${prefix}An unexpected error occurred`;
}
