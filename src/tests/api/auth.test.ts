import { describe, it, expect, afterAll, beforeEach } from 'bun:test'
import { installGoogleTestJwks, signGoogleIdToken } from '../helpers/google_auth'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const SUB = `auth_api_${Date.now()}`

const { app } = await import('../../index')
const { db } = await import('../../config/db')

const goodIdToken = () => signGoogleIdToken({ sub: SUB, email: 'api@gmail.com' })

beforeEach(() => {
  installGoogleTestJwks()
})

const post = (path: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: SUB } })
  await db.$disconnect()
})

describe('Auth API', () => {
  it('POST /api/v1/auth/google returns tokens for a valid id_token', async () => {
    const res = await post('/api/v1/auth/google', { id_token: await goodIdToken() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.access_token).toBeDefined()
    expect(json.refresh_token).toBeDefined()
    expect(json.user.email).toBe('api@gmail.com')
  })

  it('POST /api/v1/auth/google returns 401 for an invalid id_token', async () => {
    const res = await post('/api/v1/auth/google', { id_token: 'bad' })
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/auth/refresh rotates tokens; logout revokes them', async () => {
    const login = await (
      await post('/api/v1/auth/google', { id_token: await goodIdToken() })
    ).json()
    const refreshed = await post('/api/v1/auth/refresh', { refresh_token: login.refresh_token })
    expect(refreshed.status).toBe(200)
    const { refresh_token: new_refresh_token } = await refreshed.json()
    const logout = await post('/api/v1/auth/logout', { refresh_token: new_refresh_token })
    expect(logout.status).toBe(204)
    const reuse = await post('/api/v1/auth/refresh', { refresh_token: new_refresh_token })
    expect(reuse.status).toBe(401)
  })
})
