import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
const htmlQuickStart = `<script src="./goportal-game-sdk.js"></script>
<script>
  async function boot() {
    const sdk = window.GoPortalGameSDK
    await sdk.ready()
    await sdk.init({ metadata: { mode: 'html_game', build: 'v2' } })
  }
  boot().catch(console.error)
</script>`;
const reactQuickStart = `import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()
await sdk.ready()
await sdk.init({ metadata: { mode: 'react_vite_game', build: 'v2' } })`;
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
})`;
const errorHandlingSnippet = `try {
  await sdk.commands.shareGame({})
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  }
}`;
const CodeBlock = ({ title, code }) => {
    const [copied, setCopied] = React.useState(false);
    const onCopy = React.useCallback(async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }, [code]);
    return (_jsxs("div", { className: "rounded-xl border border-border bg-background/70", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-3 py-2", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: title }), _jsxs("button", { type: "button", onClick: () => void onCopy(), className: "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent", children: [copied ? _jsx(Check, { className: "h-3.5 w-3.5" }) : _jsx(Copy, { className: "h-3.5 w-3.5" }), copied ? 'Copied' : 'Copy'] })] }), _jsx("pre", { className: "overflow-x-auto p-3 text-xs leading-relaxed text-zinc-100", children: _jsx("code", { children: code }) })] }));
};
export const GameSDKDocsPage = () => {
    return (_jsx("div", { className: "min-h-screen bg-[radial-gradient(circle_at_top,hsl(240,25%,16%),hsl(240,18%,8%))]", children: _jsxs("div", { className: "mx-auto w-full max-w-6xl px-6 py-6 md:px-8", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "GoPortal Game SDK v2 - Frontend Docs" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Professional integration guide for game developers (EN/VI)." })] }), _jsxs(Link, { to: "/games/developer", className: "inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back to Developer Console"] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "1) Overview / Tong quan" }), _jsxs("div", { className: "mt-2 grid gap-3 text-sm text-muted-foreground md:grid-cols-2", children: [_jsx("p", { children: "SDK v2 is an iframe bridge. Your game sends commands to host app shell via `postMessage`; host executes API calls and returns typed responses." }), _jsx("p", { children: "SDK v2 la bridge trong iframe. Game gui command len app shell qua `postMessage`; app shell goi API va tra response co cau truc." })] })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "2) Integration Modes / Cach tich hop" }), _jsxs("div", { className: "mt-3 grid gap-4 md:grid-cols-2", children: [_jsx(CodeBlock, { title: "HTML Script Mode", code: htmlQuickStart }), _jsx(CodeBlock, { title: "NPM React/Vite Mode", code: reactQuickStart })] })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "3) Lifecycle / Vong doi bat buoc" }), _jsxs("ul", { className: "mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground", children: [_jsx("li", { children: "Create client / Tao SDK client" }), _jsx("li", { children: "`await sdk.ready()` handshake with host / handshake voi host" }), _jsx("li", { children: "`await sdk.init(...)` create session / tao session" }), _jsx("li", { children: "Use `sdk.commands.*` for gameplay actions / dung `sdk.commands.*` cho game actions" })] })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "4) API Reference (Quick)" }), _jsxs("div", { className: "mt-3 grid gap-3 text-sm md:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border border-border bg-background/60 p-3", children: [_jsx("div", { className: "mb-2 font-medium", children: "Command-style (recommended)" }), _jsxs("ul", { className: "space-y-1 text-muted-foreground", children: [_jsx("li", { children: "`sdk.commands.init(payload)`" }), _jsx("li", { children: "`sdk.commands.shareScore(payload)`" }), _jsx("li", { children: "`sdk.commands.shareAchievement(payload)`" }), _jsx("li", { children: "`sdk.commands.createRoom(payload)`" }), _jsxs("li", { children: ["`sdk.commands.joinRoom(", `{ room_id }`, ")`"] }), _jsx("li", { children: "`sdk.commands.sendState(payload)`" })] })] }), _jsxs("div", { className: "rounded-lg border border-border bg-background/60 p-3", children: [_jsx("div", { className: "mb-2 font-medium", children: "Legacy compatibility" }), _jsxs("ul", { className: "space-y-1 text-muted-foreground", children: [_jsx("li", { children: "`sdk.shareScore(score, payload?)`" }), _jsx("li", { children: "`sdk.shareAchievement(payload?)`" }), _jsx("li", { children: "`sdk.joinRoom(roomId)`" }), _jsx("li", { children: "`sdk.sendState(roomId, state, version?)`" }), _jsx("li", { children: "`sdk.on('*', handler)`" })] })] })] })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "5) Realtime Multiplayer Example / Vi du multiplayer" }), _jsx(CodeBlock, { title: "Room Sync Example", code: multiplayerSnippet })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "6) Error Handling / Xu ly loi" }), _jsx("div", { className: "mb-3 text-sm text-muted-foreground", children: "Handle `GoPortalSDKError` by message and code. / Xu ly `GoPortalSDKError` theo `message` va `code`." }), _jsx(CodeBlock, { title: "Try / Catch Example", code: errorHandlingSnippet }), _jsxs("div", { className: "mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2", children: [_jsx("div", { className: "rounded-md border border-border bg-background/60 p-2", children: "Common codes: `ERR_CHANNEL_REQUIRED`, `ERR_ROOM_REQUIRED`, `ERR_NOT_READY`" }), _jsx("div", { className: "rounded-md border border-border bg-background/60 p-2", children: "Others: `ERR_TIMEOUT`, `ERR_UNSUPPORTED_ACTION`, `ERR_INTERNAL`" })] })] }), _jsxs("section", { className: "rounded-2xl border border-border bg-card/80 p-5", children: [_jsx("h2", { className: "text-lg font-semibold", children: "7) Production Checklist / Checklist production" }), _jsxs("ul", { className: "mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground", children: [_jsx("li", { children: "Call `sdk.ready()` before first command" }), _jsx("li", { children: "Call `sdk.destroy()` on page unmount" }), _jsx("li", { children: "Use `idempotency_key` for retry-sensitive writes" }), _jsx("li", { children: "Handle timeout with safe retry strategy" }), _jsx("li", { children: "Pin SDK version for stable releases" })] })] })] })] }) }));
};
//# sourceMappingURL=GameSDKDocsPage.js.map