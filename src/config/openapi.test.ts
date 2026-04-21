import { describe, it, expect } from 'bun:test'
import { openApiConfig } from './openapi'

describe('openApiConfig', () => {
  it('has Fundflow API metadata', () => {
    const { info } = openApiConfig.documentation
    expect(info.title).toBe('Fundflow')
    expect(info.description).toBe('Fundflow API documentation')
    expect(info.version).toBe('1.0.0')
  })

  it('defines bearerAuth HTTP security scheme', () => {
    const schemes = openApiConfig.documentation.components?.securitySchemes as Record<string, unknown>
    expect(schemes?.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      description: 'Bearer token authentication (JWT or similar)'
    })
  })

  it('configures the swagger path as /openapi', () => {
    expect(openApiConfig.path).toBe('/openapi')
  })
})
