import { describe, it, expect } from 'bun:test'
import { parseSort, compareSortable, applyInAppSort } from '../../helpers/sort'

const ALLOWED = ['name', 'amount', 'created_at'] as const

describe('parseSort', () => {
  it('returns undefined sort when absent', () => {
    expect(parseSort(undefined, ALLOWED)).toEqual({ ok: true, sort: undefined })
    expect(parseSort(null, ALLOWED)).toEqual({ ok: true, sort: undefined })
  })
  it('defaults direction to asc', () => {
    expect(parseSort({ field: 'name' }, ALLOWED)).toEqual({
      ok: true,
      sort: { field: 'name', direction: 'asc' },
    })
  })
  it('accepts a valid field + direction', () => {
    expect(parseSort({ field: 'amount', direction: 'desc' }, ALLOWED)).toEqual({
      ok: true,
      sort: { field: 'amount', direction: 'desc' },
    })
  })
  it('rejects a field not in the allowlist', () => {
    expect(parseSort({ field: 'evil', direction: 'asc' }, ALLOWED).ok).toBe(false)
  })
  it('rejects a bad direction', () => {
    expect(parseSort({ field: 'name', direction: 'sideways' }, ALLOWED).ok).toBe(false)
  })
  it('rejects a non-object', () => {
    expect(parseSort('name', ALLOWED).ok).toBe(false)
    expect(parseSort([{ field: 'name' }], ALLOWED).ok).toBe(false)
  })
})

describe('compareSortable', () => {
  it('orders strings, numbers, booleans', () => {
    expect(compareSortable('a', 'b')).toBeLessThan(0)
    expect(compareSortable(2, 1)).toBeGreaterThan(0)
    expect(compareSortable(false, true)).toBeLessThan(0)
    expect(compareSortable(1, 1)).toBe(0)
  })
})

describe('applyInAppSort', () => {
  it('sorts ascending and descending by a derived value', () => {
    const asc = [{ n: 3 }, { n: 1 }, { n: 2 }]
    applyInAppSort(asc, (x) => x.n, 'asc')
    expect(asc.map((x) => x.n)).toEqual([1, 2, 3])
    const desc = [{ n: 3 }, { n: 1 }, { n: 2 }]
    applyInAppSort(desc, (x) => x.n, 'desc')
    expect(desc.map((x) => x.n)).toEqual([3, 2, 1])
  })
})
