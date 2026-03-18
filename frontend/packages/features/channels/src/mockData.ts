import type { ChannelDTO } from '@goportal/types'

export const simulateDelay = (ms = 400): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// ============================================================================
// Channels Mock Data
// ============================================================================

export const mockChannelsData: ChannelDTO[] = [
  {
    id: 'c1',
    server_id: 's1',
    name: 'general',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
  {
    id: 'c2',
    server_id: 's1',
    name: 'random',
    type: 'TEXT',
    position: 1,
    is_private: false,
  },
  {
    id: 'c3',
    server_id: 's1',
    name: 'voice-lounge',
    type: 'VOICE',
    position: 2,
    is_private: false,
  },
  {
    id: 'c4',
    server_id: 's2',
    name: 'sdk-help',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
  {
    id: 'c5',
    server_id: 's3',
    name: 'general',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
]

export const getChannelTypeIcon = (type: 'TEXT' | 'VOICE'): string => {
  return type === 'TEXT' ? '#' : '🔊'
}
