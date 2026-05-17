import { mockChannelsData, simulateDelay } from '@goportal/app-core'

export { mockChannelsData, simulateDelay }

export const getChannelTypeIcon = (type: 'TEXT' | 'VOICE' | 'LIVESTREAM'): string => {
  if (type === 'TEXT') return '#'
  if (type === 'VOICE') return '🔊'
  return '📡'
}
