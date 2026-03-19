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
export declare const featureFlags: {
    useMockData: boolean;
    debug: boolean;
};
/**
 * Check if should use mock data for a feature
 */
export declare const shouldUseMockData: () => boolean;
/**
 * Log feature flag status
 */
export declare const logFeatureFlags: () => void;
//# sourceMappingURL=features.d.ts.map