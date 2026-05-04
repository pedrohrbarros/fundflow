import { describe, it, expect, beforeEach } from 'bun:test'
import { client } from '../../config/redis'
import { cacheGet, cacheSet, cacheDel } from '../../middleware/cache'

const TEST_KEY = 'test:cache:unit'

beforeEach(async () => {
  await client.del(TEST_KEY)
})

describe('cacheGet', () => {
  it('returns null on cache miss', async () => {
    const result = await cacheGet(TEST_KEY)
    expect(result).toBeNull()
  })

  it('returns parsed value on hit', async () => {
    await client.set(TEST_KEY, JSON.stringify({ x: 1 }))
    const result = await cacheGet<{ x: number }>(TEST_KEY)
    expect(result).toEqual({ x: 1 })
  })

  it('returns null for invalid JSON', async () => {
    await client.set(TEST_KEY, 'not-valid-json{')
    const result = await cacheGet(TEST_KEY)
    expect(result).toBeNull()
  })
})

describe('cacheSet', () => {
  it('stores JSON-serialized value', async () => {
    await cacheSet(TEST_KEY, { y: 2 })
    const raw = await client.get(TEST_KEY)
    expect(JSON.parse(raw!)).toEqual({ y: 2 })
  })

  it('applies default TTL of 300s', async () => {
    await cacheSet(TEST_KEY, { y: 2 })
    const ttl = await client.ttl(TEST_KEY)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(300)
  })

  it('applies a custom TTL', async () => {
    await cacheSet(TEST_KEY, { y: 2 }, 60)
    const ttl = await client.ttl(TEST_KEY)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(60)
  })
})

describe('cacheDel', () => {
  it('removes a key from Redis', async () => {
    await client.set(TEST_KEY, 'something')
    await cacheDel(TEST_KEY)
    const result = await client.get(TEST_KEY)
    expect(result).toBeNull()
  })

  it('does not throw when key does not exist', async () => {
    await expect(cacheDel(TEST_KEY)).resolves.toBeUndefined()
  })
})
