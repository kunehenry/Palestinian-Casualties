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

    // Load data for all regions with optimized parallel processing
    async loadAllData(useProgressiveLoading = true) {
        // Use Promise.all for truly parallel requests when not using progressive loading
        if (!useProgressiveLoading) {
            const results = await Promise.allSettled([
                this.loadRegionData('gaza', false),
                this.loadRegionData('westbank', false)
            ]);

            return {
                gaza: this.processResult(results[0]),
                westbank: this.processResult(results[1])
            };
        }

        // Progressive loading - get cached data immediately
        const results = {
            gaza: await this.loadRegionData('gaza', useProgressiveLoading),
            westbank: await this.loadRegionData('westbank', useProgressiveLoading)
        };

        // If we're using progressive loading and got cached data,
        // the background fetches are already in progress
        return results;
    }

    // Process Promise.allSettled results
    processResults(results) {
        const [gazaResult, westbankResult] = results;

        return {
            gaza: this.processResult(gazaResult),
            westbank: this.processResult(westbankResult)
        };
    }

    // Process individual result from Promise.allSettled
    processResult(result) {
        if (result.status === 'fulfilled') {
            return result.value;
        }

        return {
            success: false,
            error: result.reason?.message || 'Unknown error',
            data: null,
            hasChanged: false
        };
    }

    // Clear all cached data
    clearCache() {
        try {
            localStorage.removeItem(`${CONFIG.CACHE.key}_gaza`);
            localStorage.removeItem(`${CONFIG.CACHE.key}_westbank`);

            // Reset data hashes
            this.lastDataHash = {
                gaza: null,
                westbank: null
            };
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
}

export default new APIClient();
