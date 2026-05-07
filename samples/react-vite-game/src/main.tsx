import React from 'react'
import ReactDOM from 'react-dom/client'
import { createGoPortalSDK, type SDKEventPayload } from '@goportal/game-sdk'

function App() {
  const [status, setStatus] = React.useState('Booting...')
  const [ready, setReady] = React.useState(false)
  const [sessionId, setSessionId] = React.useState('')
  const [lastShare, setLastShare] = React.useState('')

  const sdkRef = React.useRef(createGoPortalSDK())

  React.useEffect(() => {
    const sdk = sdkRef.current
    const unsubscribe = sdk.on('*', (event: SDKEventPayload) => {
      if (event?.event_type) {
        if (event.event_type === 'gop.sdk.share_status') {
          setStatus(`Share flow: ${String(event.status)} (${String(event.share_action)})`)
          return
        }
        setStatus(`Realtime event: ${String(event.event_type)}`)
      }
    })
    void sdk
      .ready()
      .then(() => sdk.init({ metadata: { mode: 'react_vite_sample', build: 'sample-v2' } }))
      .then((result) => {
        setSessionId(result?.session_id ?? '')
        setReady(true)
        setStatus('SDK ready in React/Vite game')
      })
      .catch((err) => {
        setStatus(`SDK init failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      })
    return () => {
      unsubscribe()
      sdk.destroy()
    }
  }, [])

  const shareScore = React.useCallback(() => {
    const sdk = sdkRef.current
    void sdk
      .commands.shareScore({
        score: Math.floor(Math.random() * 500),
        comment: 'React/Vite sample share',
      })
      .then((res) => {
        setLastShare(JSON.stringify(res))
        setStatus(`Score share status: ${res.share_status}`)
      })
      .catch((err) => {
        setStatus(`Share failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      })
  }, [])

  const shareNowPlaying = React.useCallback(() => {
    const sdk = sdkRef.current
    void sdk.commands
      .shareSessionStart({
        comment: 'React/Vite sample is now playing',
      })
      .then((res) => {
        setLastShare(JSON.stringify(res))
        setStatus(`Now-playing share status: ${res.share_status}`)
      })
      .catch((err) => {
        setStatus(`Now-playing failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      })
  }, [])

  return (
    <main style={{ margin: '0 auto', maxWidth: 680, padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>GoPortal SDK v2 - React/Vite Sample</h1>
      <p style={{ marginTop: 0, color: '#64748b' }}>NPM-based integration for game teams using modern bundlers.</p>
      <div
        style={{
          border: '1px solid #334155',
          borderRadius: 12,
          padding: 16,
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <p style={{ marginTop: 0 }}>Session: {sessionId || '(pending)'}</p>
        <p>Status: {status}</p>
        <p style={{ opacity: 0.85, fontSize: 12 }}>Last share result: {lastShare || '(none)'}</p>
        <button
          type="button"
          disabled={!ready}
          onClick={shareScore}
          style={{ borderRadius: 10, border: 'none', padding: '10px 16px', cursor: 'pointer', marginRight: 8 }}
        >
          Share Random Score
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={shareNowPlaying}
          style={{ borderRadius: 10, border: 'none', padding: '10px 16px', cursor: 'pointer' }}
        >
          Share Now Playing
        </button>
      </div>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
