import { describe, it, expect } from 'bun:test'
import { resolvePeriod, periodRange, periodContribution, isValidYMD } from '../../helpers/period'

describe('resolvePeriod', () => {
  it('defaults to monthly + today when omitted', () => {
    const r = resolvePeriod({})
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.period.granularity).toBe('monthly')
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r.period.date)).toBe(true)
    }
  })
  it('rejects a bad granularity', () => {
    expect(resolvePeriod({ granularity: 'weekly', date: '2026-06-05' }).ok).toBe(false)
  })
  it('rejects a non-real date', () => {
    expect(resolvePeriod({ granularity: 'daily', date: '2026-02-30' }).ok).toBe(false)
    expect(resolvePeriod({ granularity: 'daily', date: 'nope' }).ok).toBe(false)
  })
  it('accepts valid input', () => {
    const r = resolvePeriod({ granularity: 'annually', date: '2026-06-05' })
    expect(r.ok).toBe(true)
  })
})

describe('periodRange', () => {
  it('daily is a single day', () => {
    expect(periodRange({ granularity: 'daily', date: '2026-06-05' })).toEqual({
      start: { year: 2026, month: 6, day: 5 },
      end: { year: 2026, month: 6, day: 5 },
    })
  })
  it('monthly spans the month (Feb leap year)', () => {
    expect(periodRange({ granularity: 'monthly', date: '2024-02-10' })).toEqual({
      start: { year: 2024, month: 2, day: 1 },
      end: { year: 2024, month: 2, day: 29 },
    })
  })
  it('annually spans the year', () => {
    expect(periodRange({ granularity: 'annually', date: '2026-06-05' })).toEqual({
      start: { year: 2026, month: 1, day: 1 },
      end: { year: 2026, month: 12, day: 31 },
    })
  })
})

describe('periodContribution — non-recurring', () => {
  const rec = (date: string) => ({ date, is_recurring: false, amount: 100 })
  it('applies inside the period', () => {
    expect(
      periodContribution(rec('2026-06-15'), { granularity: 'monthly', date: '2026-06-01' })
    ).toEqual({ applies: true, period_amount: 100 })
  })
  it('does not apply outside the period', () => {
    expect(
      periodContribution(rec('2026-05-31'), { granularity: 'monthly', date: '2026-06-01' })
    ).toEqual({ applies: false, period_amount: 0 })
  })
})

describe('periodContribution — recurring (amount 1000, anchor 2026-06-05)', () => {
  const rec = { date: '2026-06-05', is_recurring: true, amount: 1000 }
  it('daily hit on anchor day', () => {
    expect(periodContribution(rec, { granularity: 'daily', date: '2026-08-05' })).toEqual({
      applies: true,
      period_amount: 1000,
    })
  })
  it('daily miss on non-anchor day', () => {
    expect(periodContribution(rec, { granularity: 'daily', date: '2026-08-06' })).toEqual({
      applies: false,
      period_amount: 0,
    })
  })
  it('daily before anchor does not apply', () => {
    expect(periodContribution(rec, { granularity: 'daily', date: '2026-06-04' }).applies).toBe(
      false
    )
  })
  it('monthly applies on/after anchor month', () => {
    expect(periodContribution(rec, { granularity: 'monthly', date: '2026-08-20' })).toEqual({
      applies: true,
      period_amount: 1000,
    })
  })
  it('monthly before anchor month does not apply', () => {
    expect(periodContribution(rec, { granularity: 'monthly', date: '2026-05-31' }).applies).toBe(
      false
    )
  })
  it('annual anchor year is partial', () => {
    expect(periodContribution(rec, { granularity: 'annually', date: '2026-09-01' })).toEqual({
      applies: true,
      period_amount: 7000,
    })
  })
  it('annual later year is full', () => {
    expect(periodContribution(rec, { granularity: 'annually', date: '2027-01-01' })).toEqual({
      applies: true,
      period_amount: 12000,
    })
  })
  it('annual earlier year does not apply', () => {
    expect(periodContribution(rec, { granularity: 'annually', date: '2025-12-31' })).toEqual({
      applies: false,
      period_amount: 0,
    })
  })
})

describe('periodContribution — recurring day clamp (anchor day 31)', () => {
  const rec = { date: '2026-01-31', is_recurring: true, amount: 50 }
  it('fires on the clamped last day of a short month', () => {
    expect(periodContribution(rec, { granularity: 'daily', date: '2026-02-28' }).applies).toBe(true)
  })
  it('does not fire on the day before the clamped day', () => {
    expect(periodContribution(rec, { granularity: 'daily', date: '2026-02-27' }).applies).toBe(
      false
    )
  })
})

describe('isValidYMD', () => {
  it('accepts real dates and rejects junk', () => {
    expect(isValidYMD('2026-06-05')).toBe(true)
    expect(isValidYMD('2026-13-01')).toBe(false)
    expect(isValidYMD('2026-2-5')).toBe(false)
  })
})
