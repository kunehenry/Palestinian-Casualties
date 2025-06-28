// Configuration file for Palestinian Casualties Counter
export const CONFIG = {
    // API endpoints
    API_URLS: {
        gaza: '/api/gaza',
        westbank: '/api/westbank'
    },

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
