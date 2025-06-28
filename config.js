// Configuration file for Palestinian Casualties Counter

// Environment detection
const isStaticHosting = () => {
    const hostname = window.location.hostname;
    const isGitHubPages = hostname.includes('github.io') || hostname.includes('github.com');
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    const isVercel = hostname.includes('vercel.app') || hostname.includes('vercel.com');
    const isLocalFile = window.location.protocol === 'file:';

    // Also check if we're not on localhost (common for static hosting)
    const isNotLocalhost = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');

    return isGitHubPages || isNetlify || isVercel || isLocalFile || (isNotLocalhost && !hostname.includes('.')); // Simple domain check
};

// Check if we're specifically on GitHub Pages (needs CORS proxy)
const isGitHubPages = () => {
    const hostname = window.location.hostname;
    return hostname.includes('github.io') || hostname.includes('github.com');
};

// Choose API URLs based on environment
const getAPIUrls = () => {
    if (isGitHubPages()) {
        // Use CORS proxy for GitHub Pages since direct access is blocked
        // Try corsproxy.io which is more reliable
        const corsProxy = 'https://corsproxy.io/?';
        return {
            gaza: corsProxy + encodeURIComponent('https://data.techforpalestine.org/api/v2/casualties_daily.json'),
            westbank: corsProxy + encodeURIComponent('https://data.techforpalestine.org/api/v2/west_bank_daily.json')
        };
    } else if (isStaticHosting()) {
        // Direct API endpoints for other static hosting (Netlify, Vercel, etc.)
        return {
            gaza: 'https://data.techforpalestine.org/api/v2/casualties_daily.json',
            westbank: 'https://data.techforpalestine.org/api/v2/west_bank_daily.json'
        };
    } else {
        // Local proxy endpoints for development and server deployments
        return {
            gaza: '/api/gaza',
            westbank: '/api/westbank'
        };
    }
};

export const CONFIG = {
    // API endpoints - automatically selected based on environment
    API_URLS: getAPIUrls(),

    // Cache configuration - optimized for better performance
    CACHE: {
        expiry: 3 * 60 * 1000, // 3 minutes for fresh cache (reduced from 5)
        maxAge: 20 * 60 * 1000, // 20 minutes for stale-while-revalidate (reduced from 30)
        key: 'palestine_casualties_cache'
    },

    // Auto-refresh configuration - optimized for responsiveness
    REFRESH: {
        interval: 20 * 60 * 1000, // 20 minutes (reduced from 30)
        retryDelay: 3 * 60 * 1000, // 3 minutes on error (reduced from 5)
        maxRetries: 3
    },

    // UI configuration
    UI: {
        loadingMinTime: 500, // Reduced minimum loading time (from 1000)
        errorDisplayTime: 8000, // Reduced error display time (from 10000)
        animationDuration: 200, // Faster animations (from 300)
        chartMaxPoints: 30 // Maximum points to show in chart
    },

    // Default region
    DEFAULT_REGION: 'gaza',

    // Regions configuration
    REGIONS: {
        gaza: {
            name: 'Gaza',
            hasSettlerAttacks: false,
            hasProfessionals: true
        },
        westbank: {
            name: 'West Bank',
            hasSettlerAttacks: true,
            hasProfessionals: false
        }
    }
};
