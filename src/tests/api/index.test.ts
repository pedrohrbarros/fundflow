import { describe, it, expect } from 'bun:test'
import { app } from '../../index'

describe('Documentation endpoints', () => {
  it('GET /openapi.json returns a valid OpenAPI 3.0 spec', async () => {
    const response = await app.handle(new Request('http://localhost/openapi/json'))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.openapi).toMatch(/^3\./)
    expect(json.info.title).toBe('Fundflow')
    expect(json.info.version).toBe('1.0.0')
  })

  it('GET /openapi/json spec includes bearerAuth security scheme', async () => {
    const response = await app.handle(new Request('http://localhost/openapi/json'))
    const json = await response.json()
    const bearerAuth = json.components?.securitySchemes?.bearerAuth
    expect(bearerAuth).toBeDefined()
    expect(bearerAuth.type).toBe('http')
    expect(bearerAuth.scheme).toBe('bearer')
  })

  it('GET /docs returns an HTML page embedding ReDoc', async () => {
    const response = await app.handle(new Request('http://localhost/docs'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/html')
    const html = await response.text()
    expect(html).toContain('<redoc')
    expect(html).toContain('/openapi/json')
  })
})
