import { describe, it, expect, afterAll, mock } from 'bun:test'

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

afterAll(() => {
  mock.restore()
})

describe('CORS', () => {
  it('returns Access-Control-Allow-Origin for configured origin', async () => {
    const res = await app.handle(
      new Request('http://localhost/', {
        headers: { Origin: 'http://localhost:3000' },
      })
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
  })

  it('does not set Access-Control-Allow-Origin for unknown origin', async () => {
    const res = await app.handle(
      new Request('http://localhost/', {
        headers: { Origin: 'http://evil.com' },
      })
    )
    const origin_header = res.headers.get('access-control-allow-origin')
    expect(origin_header).toBeNull()
  })
})
