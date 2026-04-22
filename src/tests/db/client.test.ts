import { describe, it, expect } from 'bun:test'
import { db } from '../../db/index'

describe('Prisma client singleton', () => {
  it('exports a defined db instance', () => {
    expect(db).toBeDefined()
  })

  it('exposes $connect as a function', () => {
    expect(typeof db.$connect).toBe('function')
  })

  it('exposes $disconnect as a function', () => {
    expect(typeof db.$disconnect).toBe('function')
  })

  it('exposes $transaction as a function', () => {
    expect(typeof db.$transaction).toBe('function')
  })
})
