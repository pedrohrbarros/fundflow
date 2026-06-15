import { describe, it, expect } from 'bun:test'
import { checkDatabase, checkRedis } from '../../config/health'

describe('startup health checks', () => {
  it('checkDatabase resolves true when the database is reachable', async () => {
    expect(await checkDatabase()).toBe(true)
  })

  it('checkRedis resolves true when redis is reachable', async () => {
    expect(await checkRedis()).toBe(true)
  })
})
