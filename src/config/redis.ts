import { createClient } from 'redis'
import { redis_logger } from './logging'

export const client = createClient({
  url: process.env.REDIS_URL,
}).on('error', (err) => redis_logger.error({ err: String(err) }, 'Redis client error'))

// Connect at import time, but never crash the process if Redis is unreachable —
// startup health checks (see ./health) report the result and decide what to do.
try {
  await client.connect()
} catch (err) {
  redis_logger.warn({ err: String(err) }, 'Redis connection failed at startup')
}
