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

  it('GET /openapi/json spec includes apiKey security scheme', async () => {
    const response = await app.handle(new Request('http://localhost/openapi/json'))
    const json = await response.json()
    const apiKey = json.components?.securitySchemes?.apiKey
    expect(apiKey).toBeDefined()
    expect(apiKey.type).toBe('apiKey')
    expect(apiKey.in).toBe('header')
    expect(apiKey.name).toBe('X-Api-Key')
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
