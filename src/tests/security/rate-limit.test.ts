import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'

describe('Rate Limiting', () => {
  it('returns 429 after exceeding the per-IP limit', async () => {
    const test_app = new Elysia()
      .use(rateLimit({ duration: 60_000, max: 3 }))
      .get('/test', () => 'ok')

    for (let i = 0; i < 3; i++) {
      await test_app.handle(new Request('http://localhost/test'))
    }
    const blocked_response = await test_app.handle(new Request('http://localhost/test'))
    expect(blocked_response.status).toBe(429)
  })

  it('allows requests up to the configured limit', async () => {
    const test_app = new Elysia()
      .use(rateLimit({ duration: 60_000, max: 3 }))
      .get('/test', () => 'ok')

    for (let i = 0; i < 3; i++) {
      const res = await test_app.handle(new Request('http://localhost/test'))
      expect(res.status).toBe(200)
    }
  })
})
