import { describe, it, expect } from 'bun:test'
import { parseFilterBody, buildWhereClause } from '../../helpers/filters'
import type { FilterCondition, FilterGroup } from '../../helpers/filters'

const allowlist = {
  name: 'string' as const,
  bio: 'string_nullable' as const,
  score: 'float' as const,
  active: 'boolean' as const,
  created_at: 'datetime' as const,
}

// ---------------------------------------------------------------------------
// parseFilterBody
// ---------------------------------------------------------------------------

describe('parseFilterBody', () => {
  it('valid single string condition', () => {
    const result = parseFilterBody({ field: 'name', op: 'is_equal', value: 'foo' }, allowlist)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const condition = result.node as FilterCondition
      expect(condition.field).toBe('name')
      expect(condition.op).toBe('is_equal')
      expect(condition.value).toBe('foo')
      expect(condition.fieldType).toBe('string')
    }
  })

  it('valid float is_between', () => {
    const result = parseFilterBody({ field: 'score', op: 'is_between', value: [1, 10] }, allowlist)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const condition = result.node as FilterCondition
      expect(condition.value).toEqual([1, 10])
    }
  })

  it('valid boolean', () => {
    const result = parseFilterBody({ field: 'active', op: 'is_equal', value: true }, allowlist)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const condition = result.node as FilterCondition
      expect(condition.value).toBe(true)
    }
  })

  it('valid datetime is_before', () => {
    const result = parseFilterBody(
      { field: 'created_at', op: 'is_before', value: '2024-01-01T00:00:00Z' },
      allowlist
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const condition = result.node as FilterCondition
      expect(condition.fieldType).toBe('datetime')
    }
  })

  it('valid AND group with two conditions', () => {
    const result = parseFilterBody(
      {
        logic: 'AND',
        conditions: [
          { field: 'name', op: 'is_equal', value: 'foo' },
          { field: 'score', op: 'is_greater', value: 5 },
        ],
      },
      allowlist
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const group = result.node as FilterGroup
      expect(group.logic).toBe('AND')
      expect(group.conditions.length).toBe(2)
    }
  })

  it('valid nested AND + OR group', () => {
    const result = parseFilterBody(
      {
        logic: 'AND',
        conditions: [
          { field: 'name', op: 'is_equal', value: 'foo' },
          {
            logic: 'OR',
            conditions: [
              { field: 'score', op: 'is_greater', value: 5 },
              { field: 'active', op: 'is_equal', value: true },
            ],
          },
        ],
      },
      allowlist
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const outer = result.node as FilterGroup
      expect(outer.logic).toBe('AND')
      const inner = outer.conditions[1] as FilterGroup
      expect(inner.logic).toBe('OR')
      expect(inner.conditions.length).toBe(2)
    }
  })

  it('valid is_null on nullable field', () => {
    const result = parseFilterBody({ field: 'bio', op: 'is_null' }, allowlist)
    expect(result.ok).toBe(true)
  })

  it('valid is_not_null on nullable field', () => {
    const result = parseFilterBody({ field: 'bio', op: 'is_not_null' }, allowlist)
    expect(result.ok).toBe(true)
  })

  it('error: unknown field', () => {
    const result = parseFilterBody(
      { field: 'nonexistent', op: 'is_equal', value: 'foo' },
      allowlist
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('unknown field')
    }
  })

  it('error: op invalid for type (is_before on float)', () => {
    const result = parseFilterBody({ field: 'score', op: 'is_before', value: 5 }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: is_between with non-array', () => {
    const result = parseFilterBody({ field: 'score', op: 'is_between', value: 5 }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: is_between with a > b (float)', () => {
    const result = parseFilterBody({ field: 'score', op: 'is_between', value: [10, 1] }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: is_between with a > b (datetime)', () => {
    const result = parseFilterBody(
      {
        field: 'created_at',
        op: 'is_between',
        value: ['2025-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
      },
      allowlist
    )
    expect(result.ok).toBe(false)
  })

  it('error: is_null on non-nullable string field', () => {
    const result = parseFilterBody({ field: 'name', op: 'is_null' }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: value present for is_null', () => {
    const result = parseFilterBody({ field: 'bio', op: 'is_null', value: 'something' }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: value missing for is_equal', () => {
    const result = parseFilterBody({ field: 'name', op: 'is_equal' }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: value wrong type (string for float field)', () => {
    const result = parseFilterBody(
      { field: 'score', op: 'is_equal', value: 'not-a-number' },
      allowlist
    )
    expect(result.ok).toBe(false)
  })

  it('error: logic not AND/OR', () => {
    const result = parseFilterBody(
      { logic: 'XOR', conditions: [{ field: 'name', op: 'is_equal', value: 'foo' }] },
      allowlist
    )
    expect(result.ok).toBe(false)
  })

  it('error: conditions empty array', () => {
    const result = parseFilterBody({ logic: 'AND', conditions: [] }, allowlist)
    expect(result.ok).toBe(false)
  })

  it('error: nested condition error propagates with index prefix', () => {
    const result = parseFilterBody(
      {
        logic: 'AND',
        conditions: [
          { field: 'name', op: 'is_equal', value: 'foo' },
          { field: 'nonexistent', op: 'is_equal', value: 'bar' },
        ],
      },
      allowlist
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/^conditions\[1\]:/)
    }
  })
})

// ---------------------------------------------------------------------------
// buildWhereClause
// ---------------------------------------------------------------------------

describe('buildWhereClause', () => {
  it('string is_equal', () => {
    const condition: FilterCondition = {
      field: 'name',
      fieldType: 'string',
      op: 'is_equal',
      value: 'foo',
    }
    expect(buildWhereClause(condition)).toEqual({ name: { equals: 'foo' } })
  })

  it('string is_contains', () => {
    const condition: FilterCondition = {
      field: 'name',
      fieldType: 'string',
      op: 'is_contains',
      value: 'foo',
    }
    expect(buildWhereClause(condition)).toEqual({ name: { contains: 'foo', mode: 'insensitive' } })
  })

  it('string_nullable is_null', () => {
    const condition: FilterCondition = { field: 'bio', fieldType: 'string_nullable', op: 'is_null' }
    expect(buildWhereClause(condition)).toEqual({ bio: null })
  })

  it('string_nullable is_not_null', () => {
    const condition: FilterCondition = {
      field: 'bio',
      fieldType: 'string_nullable',
      op: 'is_not_null',
    }
    expect(buildWhereClause(condition)).toEqual({ bio: { not: null } })
  })

  it('float is_greater', () => {
    const condition: FilterCondition = {
      field: 'score',
      fieldType: 'float',
      op: 'is_greater',
      value: 5,
    }
    expect(buildWhereClause(condition)).toEqual({ score: { gt: 5 } })
  })

  it('float is_between', () => {
    const condition: FilterCondition = {
      field: 'score',
      fieldType: 'float',
      op: 'is_between',
      value: [1, 10],
    }
    expect(buildWhereClause(condition)).toEqual({ score: { gte: 1, lte: 10 } })
  })

  it('boolean is_equal', () => {
    const condition: FilterCondition = {
      field: 'active',
      fieldType: 'boolean',
      op: 'is_equal',
      value: true,
    }
    expect(buildWhereClause(condition)).toEqual({ active: { equals: true } })
  })

  it('datetime is_before', () => {
    const condition: FilterCondition = {
      field: 'created_at',
      fieldType: 'datetime',
      op: 'is_before',
      value: '2024-01-01T00:00:00Z',
    }
    expect(buildWhereClause(condition)).toEqual({
      created_at: { lt: new Date('2024-01-01T00:00:00Z') },
    })
  })

  it('datetime is_between', () => {
    const condition: FilterCondition = {
      field: 'created_at',
      fieldType: 'datetime',
      op: 'is_between',
      value: ['2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z'],
    }
    expect(buildWhereClause(condition)).toEqual({
      created_at: {
        gte: new Date('2024-01-01T00:00:00Z'),
        lte: new Date('2025-01-01T00:00:00Z'),
      },
    })
  })

  it('AND group', () => {
    const group: FilterGroup = {
      logic: 'AND',
      conditions: [
        { field: 'name', fieldType: 'string', op: 'is_equal', value: 'foo' },
        { field: 'score', fieldType: 'float', op: 'is_greater', value: 5 },
      ],
    }
    expect(buildWhereClause(group)).toEqual({
      AND: [{ name: { equals: 'foo' } }, { score: { gt: 5 } }],
    })
  })

  it('OR group', () => {
    const group: FilterGroup = {
      logic: 'OR',
      conditions: [
        { field: 'name', fieldType: 'string', op: 'is_equal', value: 'foo' },
        { field: 'active', fieldType: 'boolean', op: 'is_equal', value: true },
      ],
    }
    expect(buildWhereClause(group)).toEqual({
      OR: [{ name: { equals: 'foo' } }, { active: { equals: true } }],
    })
  })

  it('string is_not_equal', () => {
    const condition: FilterCondition = {
      field: 'name',
      fieldType: 'string',
      op: 'is_not_equal',
      value: 'foo',
    }
    expect(buildWhereClause(condition)).toEqual({ name: { not: 'foo' } })
  })

  it('string is_starts_with', () => {
    const condition: FilterCondition = {
      field: 'name',
      fieldType: 'string',
      op: 'is_starts_with',
      value: 'foo',
    }
    expect(buildWhereClause(condition)).toEqual({
      name: { startsWith: 'foo', mode: 'insensitive' },
    })
  })

  it('string is_ends_with', () => {
    const condition: FilterCondition = {
      field: 'name',
      fieldType: 'string',
      op: 'is_ends_with',
      value: 'foo',
    }
    expect(buildWhereClause(condition)).toEqual({ name: { endsWith: 'foo', mode: 'insensitive' } })
  })

  it('float is_greater_or_equal', () => {
    const condition: FilterCondition = {
      field: 'score',
      fieldType: 'float',
      op: 'is_greater_or_equal',
      value: 5,
    }
    expect(buildWhereClause(condition)).toEqual({ score: { gte: 5 } })
  })

  it('float is_lower', () => {
    const condition: FilterCondition = {
      field: 'score',
      fieldType: 'float',
      op: 'is_lower',
      value: 5,
    }
    expect(buildWhereClause(condition)).toEqual({ score: { lt: 5 } })
  })

  it('float is_lower_or_equal', () => {
    const condition: FilterCondition = {
      field: 'score',
      fieldType: 'float',
      op: 'is_lower_or_equal',
      value: 5,
    }
    expect(buildWhereClause(condition)).toEqual({ score: { lte: 5 } })
  })

  it('nested group', () => {
    const group: FilterGroup = {
      logic: 'AND',
      conditions: [
        { field: 'name', fieldType: 'string', op: 'is_equal', value: 'foo' },
        {
          logic: 'OR',
          conditions: [
            { field: 'score', fieldType: 'float', op: 'is_greater', value: 5 },
            { field: 'active', fieldType: 'boolean', op: 'is_equal', value: false },
          ],
        },
      ],
    }
    expect(buildWhereClause(group)).toEqual({
      AND: [
        { name: { equals: 'foo' } },
        {
          OR: [{ score: { gt: 5 } }, { active: { equals: false } }],
        },
      ],
    })
  })
})
