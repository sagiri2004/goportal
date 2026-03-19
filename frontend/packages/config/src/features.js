/**
 * Feature Flags Configuration
 * Control which features use real API vs mock data
 *
 * Environment Variables:
 * - VITE_USE_MOCK_DATA=true/false (default: false)
 * - VITE_DEBUG=true/false (default: false)
 *
 * Usage:
 * - npm run dev:web - Real API (default)
 * - npm run dev:web:mock - Mock data only
 * - npm run build:web - Real API build
 * - npm run build:web:mock - Mock data build
 */
export const featureFlags = {
    // Global toggle: use mock data everywhere
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
    // Debug logging
    debug: import.meta.env.VITE_DEBUG === 'true',
};
/**
 * Check if should use mock data for a feature
 */
export const shouldUseMockData = () => {
    return featureFlags.useMockData;
};
/**
 * Log feature flag status
 */
export const logFeatureFlags = () => {
    if (featureFlags.debug) {
        console.log('[Feature Flags]', {
            useMockData: featureFlags.useMockData,
            debug: featureFlags.debug,
        });
    }
};
//# sourceMappingURL=features.js.map