import { db } from './db'
import { client } from './redis'
import { db_logger, redis_logger, logger } from './logging'

/**
 * Probe the database connection. Logs the result and returns whether it succeeded.
 * A failure is logged at FATAL level because the API cannot function without the DB.
 */
export async function checkDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    db_logger.info('Database health check passed')
    return true
  } catch (err) {
    db_logger.fatal({ err: String(err) }, 'Database health check failed')
    return false
  }
}

/**
 * Probe the Redis connection. Logs the result and returns whether it succeeded.
 * A failure is logged at WARN level because the API can still serve requests
 * without Redis (degraded caching), so it should not block startup.
 */
export async function checkRedis(): Promise<boolean> {
  try {
    const pong = await client.ping()
    redis_logger.info('Redis health check passed')
    return true
  } catch (err) {
    redis_logger.warn({ err: String(err) }, 'Redis health check failed')
    return false
  }
}

/**
 * Run all startup health checks. The database is required — if it is unreachable
 * the process exits so deploys fail loudly instead of silently serving broken
 * requests. Redis is optional and only warns.
 */
export async function runStartupHealthChecks(): Promise<void> {
  const databaseHealthy = await checkDatabase()
  await checkRedis()

  if (!databaseHealthy) {
    logger.fatal('Startup aborted: database unreachable')
    process.exit(1)
  }
}
