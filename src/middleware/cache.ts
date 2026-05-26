import { client } from '../config/redis'

const DEFAULT_TTL = 300

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await client.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> => {
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
}

export const cacheDel = async (key: string): Promise<void> => {
  await client.del(key)
}

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  let cursor = '0'
  const keysToDelete = new Set<string>()

  do {
    const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 })
    cursor = result.cursor

    for (const key of result.keys) {
      keysToDelete.add(key)
    }
  } while (cursor !== '0')

  if (keysToDelete.size > 0) {
    await client.del([...keysToDelete])
  }
}
