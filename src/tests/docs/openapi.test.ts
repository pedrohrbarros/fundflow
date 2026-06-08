import { describe, it, expect } from 'bun:test'
import { open_api_config } from '../../config/openapi'

describe('open_api_config', () => {
  it('has Fundflow API metadata', () => {
    const { info } = open_api_config.documentation
    expect(info.title).toBe('Fundflow')
    expect(info.description).toBe('Fundflow API documentation')
    expect(info.version).toBe('1.0.0')
  })

  it('defines apiKey security scheme on X-Api-Key header', () => {
    const schemes = open_api_config.documentation.components?.securitySchemes as Record<
      string,
      unknown
    >
    expect(schemes?.apiKey).toEqual({
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
      description: 'API key for Swagger documentation access',
    })
  })

  it('applies apiKey security globally', () => {
    expect(open_api_config.documentation.security).toEqual([{ apiKey: [] }])
  })

  it('configures the swagger path as /openapi', () => {
    expect(open_api_config.path).toBe('/openapi')
  })
})
