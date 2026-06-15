import { describe, it, expect } from 'bun:test'

process.env.JWT_SECRET = 'test-secret-value'
process.env.ALLOWED_ORIGINS = '["http://localhost:3000"]'
process.env.API_TOKEN = 'test-api-token'

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

  it('does not set Access-Control-Allow-Origin for unknown origin', async () => {
    const res = await app.handle(
      new Request('http://localhost/', {
        headers: { Origin: 'http://evil.com' },
      })
    )
    const origin_header = res.headers.get('access-control-allow-origin')
    expect(origin_header).toBeNull()
  })

  it('handles CORS preflight for configured origin', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/expenses', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      })
    )

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')

    const allow_methods = res.headers.get('access-control-allow-methods')
    expect(allow_methods).not.toBeNull()
    expect(allow_methods).toContain('POST')

    const allow_headers = res.headers.get('access-control-allow-headers')
    expect(allow_headers).not.toBeNull()
    expect(allow_headers!.toLowerCase()).toContain('content-type')
    expect(allow_headers!.toLowerCase()).toContain('authorization')
  })
})
