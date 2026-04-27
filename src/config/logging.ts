import pino from 'pino'
import pretty from 'pino-pretty'

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL ?? 'info'

export const logger = isDev
  ? pino(
      { level },
      pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
    )
  : pino({ level })

export const endpoint_logger = logger.child({ context: 'endpoint' })
export const db_logger = logger.child({ context: 'db' })
export const migration_logger = logger.child({ context: 'migration' })
