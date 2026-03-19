import { mockServersData, mockChannelsData, simulateDelay, } from '@goportal/app-core';
export { simulateDelay, mockServersData, mockChannelsData };
// Helper to get server initials
export const getServerInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
//# sourceMappingURL=mockData.js.map