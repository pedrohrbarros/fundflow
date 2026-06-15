import { describe, it, expect, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { withUserAuth } from '../../middleware/auth'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-key'

const userAuthApp = withUserAuth(new Elysia()).get('/protected', ({ user_external_id }) =>
  JSON.stringify({ user_external_id })
)

describe('withUserAuth — JWT mode', () => {
  it('allows a request with a valid access token', async () => {
    const token = await signAccessToken({ external_id: 'sub-1', email: 'a@b.com' })
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', { headers: { Authorization: `Bearer ${token}` } })
    )
    expect(res.status).toBe(200)
    expect(JSON.parse(await res.text()).user_external_id).toBe('sub-1')
  })

  it('rejects a missing Authorization header', async () => {
    const res = await userAuthApp.handle(new Request('http://localhost/protected'))
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', { headers: { Authorization: 'Bearer nope' } })
    )
    expect(res.status).toBe(401)
  })
})

describe('withUserAuth — docs mode', () => {
  beforeEach(() => {
    process.env.API_TOKEN = 'test-key'
  })

  it('rejects docs requests with a wrong API key', async () => {
    const res = await userAuthApp.handle(
      new Request('http://localhost/protected', {
        headers: { 'X-Docs-Mode': 'true', 'X-Api-Key': 'wrong-key' },
      })
    )
    expect(res.status).toBe(401)
  })
})
