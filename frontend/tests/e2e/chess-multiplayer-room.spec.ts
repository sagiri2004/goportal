import { test, expect, BrowserContext, Page, APIRequestContext } from '@playwright/test'

const GAME_ID = process.env.E2E_CHESS_GAME_ID ?? 'e5e96d62-df38-433f-833a-74fd6324738e'
const ROOM_ID = process.env.E2E_ROOM_ID ?? `e2e-room-${Date.now()}`
const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8080'

type LoginData = { token: string; user: { id: string; username: string } }

function attachDebugLogs(page: Page, tag: string, sink: string[]) {
  page.on('console', (msg) => sink.push(`[${tag}] console.${msg.type()}: ${msg.text()}`))
  page.on('pageerror', (err) => sink.push(`[${tag}] pageerror: ${err.message}`))
  page.on('requestfailed', (req) =>
    sink.push(`[${tag}] requestfailed: ${req.method()} ${req.url()} -> ${req.failure()?.errorText ?? 'unknown'}`),
  )
}

async function ensureUserAndLogin(request: APIRequestContext, suffix: string): Promise<LoginData> {
  const username = `e2e_${suffix}_${Date.now().toString().slice(-6)}`
  const password = 'Pass@12345'
  await request.post(`${API_BASE}/api/v1/auth/register`, {
    data: { username, password, confirm_password: password, email: `${username}@local.test` },
  })
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { username, password },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { data: LoginData }
  return body.data
}

async function seedAuth(page: Page, login: LoginData) {
  const persisted = {
    state: {
      token: login.token,
      user: {
        id: login.user.id,
        username: login.user.username,
        is_admin: false,
      },
      isAuthenticated: true,
    },
    version: 0,
  }
  await page.addInitScript(
    ({ token, persistedRaw }) => {
      window.localStorage.setItem('auth_token', token)
      window.localStorage.setItem('auth-token', token)
      window.localStorage.setItem('auth-store', persistedRaw)
    },
    { token: login.token, persistedRaw: JSON.stringify(persisted) },
  )
}

async function openGameHost(page: Page) {
  await page.goto(`/games/${GAME_ID}/play`, { waitUntil: 'domcontentloaded' })
  const frame = page.frameLocator(`iframe[title]`)
  await expect(frame.getByText('GoPortal Multiplayer (2 players)')).toBeVisible()
  return frame
}

test.describe('Chess Multiplayer Room', () => {
  test('2 users can join/ready/unready and sync in iframe host mode', async ({ browser, request }) => {
    const logs: string[] = []

    const whiteLogin = await ensureUserAndLogin(request, 'w')
    const blackLogin = await ensureUserAndLogin(request, 'b')

    const ctxWhite: BrowserContext = await browser.newContext()
    const ctxBlack: BrowserContext = await browser.newContext()
    const white = await ctxWhite.newPage()
    const black = await ctxBlack.newPage()

    attachDebugLogs(white, 'white', logs)
    attachDebugLogs(black, 'black', logs)

    await seedAuth(white, whiteLogin)
    await seedAuth(black, blackLogin)

    const whiteFrame = await openGameHost(white)
    const blackFrame = await openGameHost(black)

    await whiteFrame.locator('#roomIdInput').fill(ROOM_ID)

    await whiteFrame.getByRole('button', { name: 'Create Room', exact: true }).click()
    await expect(whiteFrame.locator('#myRoleInfo')).toContainText('Role: white')
    const whiteRoleText = (await whiteFrame.locator('#myRoleInfo').textContent()) ?? ''
    const roomMatch = whiteRoleText.match(/Room:\s*([a-f0-9-]{8,})/i)
    const createdRoomID = roomMatch?.[1] ?? ROOM_ID
    await blackFrame.locator('#roomIdInput').fill(createdRoomID)

    await blackFrame.getByRole('button', { name: 'Join Room', exact: true }).click()
    await expect(blackFrame.locator('#myRoleInfo')).toContainText('Role: black')

    await whiteFrame.getByRole('button', { name: 'Ready', exact: true }).click()
    await expect(whiteFrame.locator('#lobbyInfo')).toContainText('(ready)')
    await expect.poll(async () => (await blackFrame.locator('#lobbyInfo').textContent()) ?? '').toContain('(ready)')

    await whiteFrame.getByRole('button', { name: 'Unready', exact: true }).click()
    await expect.poll(async () => (await blackFrame.locator('#lobbyInfo').textContent()) ?? '').toContain('(not-ready)')

    await ctxWhite.close()
    await ctxBlack.close()

    if (logs.length > 0) {
      test.info().attach('browser-debug.log', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      })
    }
  })
})
