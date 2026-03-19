import { mockChannelsData, simulateDelay } from '@goportal/app-core'

export { mockChannelsData, simulateDelay }

export const getChannelTypeIcon = (type: 'TEXT' | 'VOICE'): string => {
  return type === 'TEXT' ? '#' : '🔊'
}
