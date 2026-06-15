import pino from 'pino'
import { Writable } from 'stream'

const level = process.env.LOG_LEVEL ?? 'info'
const isDev = process.env.NODE_ENV !== 'production'

const LEVEL_LABELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
}

export function createDevStream(output: NodeJS.WritableStream = process.stdout) {
  return new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      try {
        const log = JSON.parse(chunk.toString()) as {
          time: number
          level: number
          msg: string
          pid?: number
          hostname?: string
          context?: string
          [key: string]: unknown
        }
        const time = new Date(log.time).toISOString().replace('T', ' ').slice(0, 19)
        const type = LEVEL_LABELS[log.level] ?? 'INFO'
        const { time: _t, level: _l, pid: _p, hostname: _h, context: _c, msg: _m, ...data } = log
        const has_data = Object.keys(data).length > 0
        const line = has_data
          ? `${time} - ${type} - ${log.msg} ${JSON.stringify(data)}`
          : `${time} - ${type} - ${log.msg}`
        output.write(line + '\n')
      } catch {
        output.write(chunk)
      }
      callback()
    },
  })
}

export const logger = isDev ? pino({ level }, createDevStream()) : pino({ level })
export const endpoint_logger = logger.child({ context: 'endpoint' })
export const db_logger = logger.child({ context: 'db' })
export const redis_logger = logger.child({ context: 'redis' })
export const migration_logger = logger.child({ context: 'migration' })
