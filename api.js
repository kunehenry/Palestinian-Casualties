import { CONFIG } from './config.js';
import { getCachedData, setCachedData, hashData, validateData, createErrorMessage, performanceMonitor } from './utils.js';

class APIClient {
    constructor() {
        this.requestController = new AbortController();
        this.pendingRequests = new Map();
        this.lastDataHash = {
            gaza: null,
            westbank: null
        };
    }

    // Abort all pending requests
    abortRequests() {
        this.requestController.abort();
        this.requestController = new AbortController();
        this.pendingRequests.clear();
    }

    // Fetch data from API with improved caching and progressive loading
    async fetchData(region, showCachedFirst = true) {
        const url = CONFIG.API_URLS[region];
        if (!url) {
            throw new Error(`Invalid region: ${region}`);
        }

        // Check for pending request
        if (this.pendingRequests.has(region)) {
            return this.pendingRequests.get(region);
        }

        // Check cache first and return immediately if requested
        const cached = getCachedData(region);
        if (showCachedFirst && cached?.data) {
            // Return cached data immediately, then fetch in background
            this.fetchInBackground(region, url);
            return cached.data;
        }

        // If cache is fresh, just return it
        if (cached?.fresh) {
            return cached.data;
        }

        // Create fetch promise
        const fetchPromise = this.performFetch(region, url, !!cached);
        this.pendingRequests.set(region, fetchPromise);

        try {
            const result = await fetchPromise;
            this.pendingRequests.delete(region);
            return result;
        } catch (error) {
            this.pendingRequests.delete(region);

            // Return stale cache if available
            if (cached?.data) {
                console.warn('Using stale cache due to fetch error:', error);
                return cached.data;
            }

            throw error;
        }
    }

    // Fetch data in background without blocking UI
    async fetchInBackground(region, url) {
        try {
            if (this.pendingRequests.has(region)) {
                return; // Already fetching
            }

            const fetchPromise = this.performFetch(region, url, true);
            this.pendingRequests.set(region, fetchPromise);

            await fetchPromise;
            this.pendingRequests.delete(region);

            // Emit event for UI to update if data changed
            window.dispatchEvent(new CustomEvent('dataUpdated', {
                detail: { region }
            }));
        } catch (error) {
            this.pendingRequests.delete(region);
            // Background fetch failure is normal, don't spam console
        }
    }

    // Perform the actual fetch operation with shorter timeout
    async performFetch(region, url, hasStaleCache) {
        performanceMonitor.start(`API fetch ${region}`);

        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
            timeoutController.abort();
        }, 8000); // Reduced to 8 second timeout

        // Check if we're using GitHub Pages (CORS proxy)
        const isUsingCORSProxy = url.includes('codetabs.com') || url.includes('cors.sh') || url.includes('corsproxy.io') || url.includes('allorigins.win');

        // Use simplified headers for CORS proxy to avoid preflight issues
        const headers = isUsingCORSProxy ? {
            'Accept': 'application/json'
            // No Cache-Control header for CORS proxy
        } : {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };

        try {
            const response = await fetch(url, {
                signal: timeoutController.signal,
                method: 'GET',
                mode: 'cors',
                headers
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const validatedData = validateData(data);

            // Cache the validated data
            setCachedData(region, validatedData);

            performanceMonitor.end(`API fetch ${region}`);
            return validatedData;
        } catch (error) {
            clearTimeout(timeoutId);
            performanceMonitor.end(`API fetch ${region}`);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            throw new Error(createErrorMessage(error, 'Fetch failed'));
        }
    }

    // Check if data has changed since last fetch
    hasDataChanged(data, region) {
        const currentHash = hashData(data, region);
        const lastHash = this.lastDataHash[region];

        if (currentHash !== lastHash) {
            this.lastDataHash[region] = currentHash;
            return true;
        }

        return false;
    }

    // Load data for a specific region with progressive loading
    async loadRegionData(region, useProgressiveLoading = true) {
        try {
            const data = await this.fetchData(region, useProgressiveLoading);

            return {
                success: true,
                data,
                hasChanged: this.hasDataChanged(data, region)
            };
        } catch (error) {
            console.error(`Failed to load ${region} data:`, error);
            return {
                success: false,
                error: error.message,
                data: null,
                hasChanged: false
            };
        }
    }

    // Load data for a specific date
    async loadRegionDataForDate(region, selectedDate) {
        try {
            const allData = await this.fetchData(region, false);

            // Filter data to find the entry for the specific date
            const dateEntry = allData.find(entry => entry.report_date === selectedDate);

            if (!dateEntry) {
                // If exact date not found, return the closest previous date with data
                const sortedData = allData.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
                const targetDate = new Date(selectedDate);

                const closestEntry = sortedData.find(entry => {
                    const entryDate = new Date(entry.report_date);
                    return entryDate <= targetDate;
                });

                if (!closestEntry) {
                    throw new Error(`No data available for ${selectedDate} or any previous date`);
                }

                return {
                    success: true,
                    data: [closestEntry],
                    isClosestDate: true,
                    actualDate: closestEntry.report_date
                };
            }

            return {
                success: true,
                data: [dateEntry],
                isClosestDate: false,
                actualDate: selectedDate
            };
        } catch (error) {
            console.error(`Failed to load ${region} data for date ${selectedDate}:`, error);
            return {
                success: false,
                error: error.message,
                data: null,
                isClosestDate: false,
                actualDate: null
            };
        }
    }

    // Load data for all regions with optimized parallel processing
    async loadAllData(useProgressiveLoading = true) {
        try {
            const regions = Object.keys(CONFIG.REGIONS);
            const promises = regions.map(region => this.loadRegionData(region, useProgressiveLoading));

            const results = await Promise.allSettled(promises);

            const processedResults = {};
            regions.forEach((region, index) => {
                const result = results[index];
                if (result.status === 'fulfilled') {
                    processedResults[region] = result.value;
                } else {
                    processedResults[region] = {
                        success: false,
                        error: result.reason?.message || 'Unknown error',
                        data: null,
                        hasChanged: false
                    };
                }
            });

            return processedResults;
        } catch (error) {
            console.error('Failed to load all data:', error);
            throw error;
        }
    }

    // Clear all cached data
    clearCache() {
        Object.keys(CONFIG.REGIONS).forEach(region => {
            localStorage.removeItem(`${CONFIG.CACHE.key}_${region}`);
        });
    }
}

export default new APIClient();
