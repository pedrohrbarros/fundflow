import { describe, it, expect, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { withBearerAuth, withUserAuth } from '../../middleware/auth'

const testApp = withBearerAuth(new Elysia()).get('/protected', () => 'secret')

const userAuthApp = withUserAuth(new Elysia()).get('/protected', ({ clerk_user_id }) =>
  JSON.stringify({ clerk_user_id })
)

describe('withBearerAuth', () => {
  beforeEach(() => {
    process.env.API_TOKEN = 'test-key'
  })

  it('allows requests with the correct bearer token', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer test-key' },
      })
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('secret')
  })

  it('rejects requests with a wrong bearer token', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer wrong-key' },
      })
    )
    expect(response.status).toBe(401)
  })

  it('rejects requests with no Authorization header', async () => {
    const response = await testApp.handle(new Request('http://localhost/protected'))
    expect(response.status).toBe(401)
  })

  it('rejects requests with a non-Bearer auth scheme', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })
    )
    expect(response.status).toBe(401)
  })
})

describe('withUserAuth — docs mode (wrong credentials)', () => {
  beforeEach(() => {
    process.env.API_TOKEN = 'test-key'
  })

  it('rejects docs requests with wrong API key', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', {
        headers: { 'X-Docs-Mode': 'true', 'X-Api-Key': 'wrong-key' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('rejects docs requests with no API key', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', {
        headers: { 'X-Docs-Mode': 'true' },
      })
    )
    expect(res.status).toBe(401)
  })
})

describe('withUserAuth — normal mode', () => {
  beforeEach(() => {
    process.env.API_TOKEN = 'test-key'
  })

  it('rejects requests with no Authorization header', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', {
        headers: { 'X-Api-Key': 'test-key' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('rejects requests with a non-Bearer auth scheme', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz', 'X-Api-Key': 'test-key' },
      })
    )
    expect(res.status).toBe(401)
  })
})
