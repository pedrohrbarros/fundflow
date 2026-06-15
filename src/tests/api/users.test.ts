import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_users_api_${Date.now()}`
const TEST_EMAIL = `${TEST_EXTERNAL_ID}@test.local`

const req = async (method: string, path: string, body?: unknown) => {
  const token = await signAccessToken({ external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL })
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL } })
})

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Users API', () => {
  it('PATCH /api/v1/users/me updates the user country', async () => {
    const res = await req('PATCH', '/api/v1/users/me', { country: 'US' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.country).toBe('US')
    expect(json.id).toBeDefined()
  })

  it('PATCH /api/v1/users/me returns 400 for invalid country code', async () => {
    const res = await req('PATCH', '/api/v1/users/me', { country: 'INVALID' })
    expect(res.status).toBe(400)
  })

  it('GET /api/v1/users/me returns the current user', async () => {
    const res = await req('GET', '/api/v1/users/me')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(typeof json.country).toBe('string')
  })

  it('GET /api/v1/users/me returns the user with email', async () => {
    const res = await req('GET', '/api/v1/users/me')
    expect(res.status).toBe(200)
    expect((await res.json()).email).toBe(TEST_EMAIL)
  })

  it('DELETE /api/v1/users/me deletes the account', async () => {
    const id = `${TEST_EXTERNAL_ID}_del`
    await db.user.create({ data: { external_id: id, email: `${id}@test.local` } })
    const token = await signAccessToken({ external_id: id, email: `${id}@test.local` })
    const res = await app.handle(
      new Request('http://localhost/api/v1/users/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    )
    expect(res.status).toBe(204)
    expect(await db.user.findUnique({ where: { external_id: id } })).toBeNull()
  })
})
