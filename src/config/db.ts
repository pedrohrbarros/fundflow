import { PrismaClient } from '../prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { db_logger } from './logging'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')

const adapter = new PrismaPg({ connectionString })

export const db = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
})

// e.params intentionally excluded — contains raw bound values (PII/credentials risk)
db.$on('query', (e) => {
  db_logger.debug({ query: e.query, duration: e.duration }, 'DB query')
})

for (const level of ['info', 'warn', 'error'] as const) {
  db.$on(level, (e) => db_logger[level]({ message: e.message, target: e.target }, `DB ${level}`))
}
