import { describe, it, expect, mock } from 'bun:test'

process.env.ALLOWED_ORIGINS = '["http://localhost:3000"]'
process.env.API_TOKEN = 'test-api-token'

mock.module('../../config/db', () => ({
  db: {},
}))

mock.module('../../config/redis', () => ({
  client: {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    quit: async () => null,
  },
}))

const { app } = await import('../../index')

describe('CORS', () => {
  it('returns Access-Control-Allow-Origin for configured origin', async () => {
    const res = await app.handle(
      new Request('http://localhost/', {
        headers: { Origin: 'http://localhost:3000' },
      })
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
  })

  it('does not reflect unknown origin in CORS header', async () => {
    const res = await app.handle(
      new Request('http://localhost/', {
        headers: { Origin: 'http://evil.com' },
      })
    )
    expect(res.headers.get('access-control-allow-origin')).not.toBe('http://evil.com')
  })
})
