import { describe, it, expect, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { requireAuth } from '../../middleware/auth'

const testApp = new Elysia()
  .get('/protected', () => 'secret', { beforeHandle: requireAuth })

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test-key'
  })

  it('allows requests with the correct bearer token', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer test-key' }
      })
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('secret')
  })

  it('rejects requests with a wrong bearer token', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer wrong-key' }
      })
    )
    expect(response.status).toBe(401)
  })

  it('rejects requests with no Authorization header', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected')
    )
    expect(response.status).toBe(401)
  })

  it('rejects requests with a non-Bearer auth scheme', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' }
      })
    )
    expect(response.status).toBe(401)
  })
})
