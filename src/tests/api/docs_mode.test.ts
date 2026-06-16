import { describe, it, expect, afterAll } from 'bun:test'

process.env.API_TOKEN = 'test-api-token'
process.env.JWT_SECRET = 'test-secret-value'

const { app } = await import('../../index')
const { db } = await import('../../config/db')

const docsRequest = (apiKey: string) =>
  app.handle(
    new Request('http://localhost/api/v1/categories/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Docs-Mode': 'true',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({}),
    })
  )

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: { startsWith: 'docs-test-user-' } } })
  await db.$disconnect()
})

describe('Docs mode (Swagger test-user)', () => {
  it('returns 200 for a valid X-Api-Key in docs mode', async () => {
    const res = await docsRequest(process.env.API_TOKEN!)
    expect(res.status).toBe(200)
  })

  it('returns 401 for a wrong X-Api-Key in docs mode', async () => {
    const res = await docsRequest('wrong-key')
    expect(res.status).toBe(401)
  })
})
