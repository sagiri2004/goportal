import React from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

const htmlQuickStart = `<script src="./goportal-game-sdk.js"></script>
<script>
  async function boot() {
    const sdk = window.GoPortalGameSDK
    await sdk.ready()
    await sdk.init({ metadata: { mode: 'html_game', build: 'v2' } })
  }
  boot().catch(console.error)
</script>`

const reactQuickStart = `import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()
await sdk.ready()
await sdk.init({ metadata: { mode: 'react_vite_game', build: 'v2' } })`

const multiplayerSnippet = `await sdk.ready()
await sdk.init({ metadata: { mode: 'multiplayer' } })

const room = await sdk.commands.createRoom({ room_name: 'my-room', max_players: 8 })
await sdk.commands.subscribeRoom({ room_id: room.room.id })

sdk.on('GAME_ROOM_STATE_UPDATED', (event) => {
  console.log('room update', event)
})

await sdk.commands.sendState({
  room_id: room.room.id,
  state: { players: { p1: { x: 10, y: 20 } } },
  state_version: 2,
  idempotency_key: \`state-\${Date.now()}\`,
})`

const errorHandlingSnippet = `try {
  await sdk.commands.shareGame({})
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  }
}`

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => {
  const [copied, setCopied] = React.useState(false)

  const onCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [code])

  return (
    <div className="rounded-xl border border-border bg-background/70">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const GameSDKDocsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(240,25%,16%),hsl(240,18%,8%))]">
      <div className="mx-auto w-full max-w-6xl px-6 py-6 md:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">GoPortal Game SDK v2 - Frontend Docs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Professional integration guide for game developers (EN/VI).
            </p>
          </div>
          <Link
            to="/games/developer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Developer Console
          </Link>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">1) Overview / Tong quan</h2>
            <div className="mt-2 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>
                SDK v2 is an iframe bridge. Your game sends commands to host app shell via `postMessage`; host executes API
                calls and returns typed responses.
              </p>
              <p>
                SDK v2 la bridge trong iframe. Game gui command len app shell qua `postMessage`; app shell goi API va tra
                response co cau truc.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">2) Integration Modes / Cach tich hop</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <CodeBlock title="HTML Script Mode" code={htmlQuickStart} />
              <CodeBlock title="NPM React/Vite Mode" code={reactQuickStart} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">3) Lifecycle / Vong doi bat buoc</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Create client / Tao SDK client</li>
              <li>`await sdk.ready()` handshake with host / handshake voi host</li>
              <li>`await sdk.init(...)` create session / tao session</li>
              <li>Use `sdk.commands.*` for gameplay actions / dung `sdk.commands.*` cho game actions</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">4) API Reference (Quick)</h2>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="mb-2 font-medium">Command-style (recommended)</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>`sdk.commands.init(payload)`</li>
                  <li>`sdk.commands.shareScore(payload)`</li>
                  <li>`sdk.commands.shareAchievement(payload)`</li>
                  <li>`sdk.commands.createRoom(payload)`</li>
                  <li>`sdk.commands.joinRoom({`{ room_id }`})`</li>
                  <li>`sdk.commands.sendState(payload)`</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="mb-2 font-medium">Legacy compatibility</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>`sdk.shareScore(score, payload?)`</li>
                  <li>`sdk.shareAchievement(payload?)`</li>
                  <li>`sdk.joinRoom(roomId)`</li>
                  <li>`sdk.sendState(roomId, state, version?)`</li>
                  <li>`sdk.on('*', handler)`</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">5) Realtime Multiplayer Example / Vi du multiplayer</h2>
            <CodeBlock title="Room Sync Example" code={multiplayerSnippet} />
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">6) Error Handling / Xu ly loi</h2>
            <div className="mb-3 text-sm text-muted-foreground">
              Handle `GoPortalSDKError` by message and code. / Xu ly `GoPortalSDKError` theo `message` va `code`.
            </div>
            <CodeBlock title="Try / Catch Example" code={errorHandlingSnippet} />
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <div className="rounded-md border border-border bg-background/60 p-2">
                Common codes: `ERR_CHANNEL_REQUIRED`, `ERR_ROOM_REQUIRED`, `ERR_NOT_READY`
              </div>
              <div className="rounded-md border border-border bg-background/60 p-2">
                Others: `ERR_TIMEOUT`, `ERR_UNSUPPORTED_ACTION`, `ERR_INTERNAL`
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold">7) Production Checklist / Checklist production</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Call `sdk.ready()` before first command</li>
              <li>Call `sdk.destroy()` on page unmount</li>
              <li>Use `idempotency_key` for retry-sensitive writes</li>
              <li>Handle timeout with safe retry strategy</li>
              <li>Pin SDK version for stable releases</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

