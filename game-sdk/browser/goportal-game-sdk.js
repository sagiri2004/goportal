;(function () {
  const pending = new Map()
  const listeners = new Map()
  const processedEventIds = new Map()
  const roomVersions = new Map()

  const request = (action, payload) =>
    new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      pending.set(requestId, { resolve, reject })

      window.parent.postMessage(
        {
          type: 'GOPORTAL_SDK_REQUEST',
          request_id: requestId,
          action,
          payload: payload || {},
        },
        '*',
      )

      setTimeout(() => {
        if (!pending.has(requestId)) return
        pending.delete(requestId)
        reject(new Error(`SDK request timeout: ${action}`))
      }, 15000)
    })

  const emitEvent = (payload) => {
    const eventType = payload.event_type || 'game.room.event'
    const targets = [...(listeners.get(eventType) || []), ...(listeners.get('*') || [])]
    targets.forEach((handler) => {
      try {
        handler(payload)
      } catch {}
    })
  }

  const markProcessed = (eventId) => {
    if (!eventId) return true
    if (processedEventIds.has(eventId)) return false
    processedEventIds.set(eventId, Date.now())
    if (processedEventIds.size > 1000) {
      const sorted = [...processedEventIds.entries()].sort((a, b) => a[1] - b[1])
      sorted.slice(0, 300).forEach(([id]) => processedEventIds.delete(id))
    }
    return true
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {}
    if (data.type === 'GOPORTAL_GAME_EVENT' && data.payload) {
      const payload = data.payload
      const eventId = typeof payload.event_id === 'string' ? payload.event_id.trim() : ''
      if (!markProcessed(eventId)) {
        return
      }

      const roomId = typeof payload.room_id === 'string' ? payload.room_id : ''
      const incomingVersion = Number(payload.state_version || 0)
      const currentVersion = roomId ? Number(roomVersions.get(roomId) || 0) : 0

      if (roomId && incomingVersion > 0 && currentVersion > 0 && incomingVersion > currentVersion + 1) {
        request('getRoomState', { room_id: roomId })
          .then((roomState) => {
            const latestVersion = Number(roomState?.room?.state_version || incomingVersion)
            roomVersions.set(roomId, latestVersion)
            emitEvent({
              event_id: `rehydrate-${Date.now()}`,
              event_type: 'GAME_ROOM_STATE_UPDATED',
              occurred_at: new Date().toISOString(),
              game_id: roomState?.room?.game_id || payload.game_id,
              room_id: roomId,
              actor_user_id: payload.actor_user_id,
              member_user_ids: Array.isArray(roomState?.members) ? roomState.members.map((item) => item.user_id) : [],
              channel_id: roomState?.room?.channel_id,
              room_status: roomState?.room?.status || payload.room_status,
              state_version: latestVersion,
              state: roomState?.room?.current_state,
              source: 'rehydrate',
            })
          })
          .catch(() => {
            if (incomingVersion >= currentVersion) {
              roomVersions.set(roomId, incomingVersion)
              emitEvent(payload)
            }
          })
        return
      }

      if (roomId && incomingVersion > 0) {
        if (incomingVersion < currentVersion) {
          return
        }
        roomVersions.set(roomId, incomingVersion)
      }

      emitEvent(payload)
      return
    }
    if (data.type !== 'GOPORTAL_SDK_RESPONSE' || typeof data.request_id !== 'string') {
      return
    }
    const ref = pending.get(data.request_id)
    if (!ref) {
      return
    }
    pending.delete(data.request_id)
    if (data.ok) {
      ref.resolve(data.data)
      return
    }
    ref.reject(new Error(data.error || 'SDK request failed'))
  })

  const sdk = {
    init(payload) {
      return request('init', payload)
    },
    shareScore(score, payload) {
      return request('shareScore', { ...(payload || {}), score })
    },
    shareAchievement(payload) {
      return request('shareAchievement', payload)
    },
    shareGame(payload) {
      return request('shareGame', payload)
    },
    createRoom(payload) {
      return request('createRoom', payload)
    },
    joinRoom(roomId) {
      return request('joinRoom', { room_id: roomId })
    },
    leaveRoom(roomId) {
      return request('leaveRoom', { room_id: roomId })
    },
    getRoomState(roomId) {
      return request('getRoomState', { room_id: roomId })
    },
    subscribeRoom(roomId) {
      return request('subscribeRoom', { room_id: roomId })
    },
    sendState(roomId, state, stateVersion) {
      return request('sendState', { room_id: roomId, state, state_version: stateVersion })
    },
    on(eventType, handler) {
      const key = eventType || '*'
      const current = listeners.get(key) || []
      current.push(handler)
      listeners.set(key, current)
      return () => {
        const next = (listeners.get(key) || []).filter((item) => item !== handler)
        listeners.set(key, next)
      }
    },
  }

  window.GoPortalGameSDK = sdk
})()
