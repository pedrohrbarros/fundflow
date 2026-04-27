import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { WEBHOOK_RATE_LIMIT } from '../../constants/api/rules/webhooks'

// Fresh app per test — isolates rate limit counter state between cases
const makeApp = () =>
  new Elysia()
    .use(rateLimit({ ...WEBHOOK_RATE_LIMIT, scoping: 'scoped', generator: () => 'test-client' }))
    .post('/webhooks/clerk/register', () => ({ ok: true }))

const makeRequest = (app: ReturnType<typeof makeApp>) =>
  app.handle(
    new Request('http://localhost/webhooks/clerk/register', { method: 'POST', body: '{}' })
  )

describe('Webhook rate limiter — stress test', () => {
  it('allows all 50 requests within the limit', async () => {
    const app = makeApp()

    for (let i = 0; i < WEBHOOK_RATE_LIMIT.max; i++) {
      const res = await makeRequest(app)
      expect(res.status).not.toBe(429)
    }
  })

  it('blocks the 51st request with 429', async () => {
    const app = makeApp()

    for (let i = 0; i < WEBHOOK_RATE_LIMIT.max; i++) {
      await makeRequest(app)
    }

    const blocked = await makeRequest(app)
    expect(blocked.status).toBe(429)
  })

  it('keeps blocking past the limit', async () => {
    const app = makeApp()

    for (let i = 0; i < WEBHOOK_RATE_LIMIT.max; i++) {
      await makeRequest(app)
    }

    const extra = await Promise.all([makeRequest(app), makeRequest(app), makeRequest(app)])
    for (const res of extra) {
      expect(res.status).toBe(429)
    }
  })
})
