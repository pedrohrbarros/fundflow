import { describe, it, expect } from 'bun:test'
import { open_api_config } from '../../config/openapi'

describe('open_api_config', () => {
  it('has Fundflow API metadata', () => {
    const { info } = open_api_config.documentation
    expect(info.title).toBe('Fundflow')
    expect(info.description).toBe('Fundflow API documentation')
    expect(info.version).toBe('1.0.0')
  })

  it('defines bearerAuth HTTP security scheme', () => {
    const schemes = open_api_config.documentation.components?.securitySchemes as Record<
      string,
      unknown
    >
    expect(schemes?.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      description: 'Bearer token authentication (JWT or similar)',
    })
  })

  it('configures the swagger path as /openapi', () => {
    expect(open_api_config.path).toBe('/openapi')
  })
})
