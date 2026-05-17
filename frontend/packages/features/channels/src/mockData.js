import { mockChannelsData, simulateDelay } from '@goportal/app-core';
export { mockChannelsData, simulateDelay };
export const getChannelTypeIcon = (type) => {
    if (type === 'TEXT')
        return '#';
    if (type === 'VOICE')
        return '🔊';
    return '📡';
};
//# sourceMappingURL=mockData.js.map