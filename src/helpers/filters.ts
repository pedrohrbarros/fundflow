export type FieldType = 'string' | 'string_nullable' | 'float' | 'boolean' | 'datetime'
export type FieldAllowlist = Record<string, FieldType>

export type FilterOp =
  | 'is_equal'
  | 'is_not_equal'
  | 'is_contains'
  | 'is_starts_with'
  | 'is_ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'is_greater'
  | 'is_greater_or_equal'
  | 'is_lower'
  | 'is_lower_or_equal'
  | 'is_between'
  | 'is_before'
  | 'is_after'

export type FilterValue = string | number | boolean | [number, number] | [string, string]

export type FilterCondition = {
  field: string
  fieldType: FieldType
  op: FilterOp
  value?: FilterValue
}

export type FilterGroup = {
  logic: 'AND' | 'OR'
  conditions: FilterNode[]
}

export type FilterNode = FilterCondition | FilterGroup

type FilterOk = { ok: true; node: FilterNode }
type FilterError = { ok: false; error: string }
export type FilterResult = FilterOk | FilterError

const VALID_OPS: Record<FieldType, FilterOp[]> = {
  string: ['is_equal', 'is_not_equal', 'is_contains', 'is_starts_with', 'is_ends_with'],
  string_nullable: [
    'is_equal',
    'is_not_equal',
    'is_contains',
    'is_starts_with',
    'is_ends_with',
    'is_null',
    'is_not_null',
  ],
  float: [
    'is_equal',
    'is_not_equal',
    'is_greater',
    'is_greater_or_equal',
    'is_lower',
    'is_lower_or_equal',
    'is_between',
  ],
  boolean: ['is_equal'],
  datetime: ['is_equal', 'is_before', 'is_after', 'is_between'],
}

const isValidIso8601 = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const parseFilterBody = (raw: unknown, allowlist: FieldAllowlist): FilterResult => {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'filter must be a non-null, non-array object' }
  }

  if ('logic' in raw) {
    const { logic, conditions } = raw as Record<string, unknown>

    if (logic !== 'AND' && logic !== 'OR') {
      return { ok: false, error: "logic must be 'AND' or 'OR'" }
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      return { ok: false, error: 'conditions must be a non-empty array' }
    }

    const parsedConditions: FilterNode[] = []
    for (let index = 0; index < conditions.length; index++) {
      const result = parseFilterBody(conditions[index], allowlist)
      if (!result.ok) {
        return { ok: false, error: `conditions[${index}]: ${result.error}` }
      }
      parsedConditions.push(result.node)
    }

    return {
      ok: true,
      node: { logic: logic as 'AND' | 'OR', conditions: parsedConditions },
    }
  }

  const { field, op, value } = raw as Record<string, unknown>

  if (typeof field !== 'string' || !(field in allowlist)) {
    return { ok: false, error: `unknown field: '${String(field)}'` }
  }

  const fieldType = allowlist[field]
  const validOps = VALID_OPS[fieldType]

  if (typeof op !== 'string' || !validOps.includes(op as FilterOp)) {
    return {
      ok: false,
      error: `op '${String(op)}' is not valid for field type '${fieldType}'`,
    }
  }

  const filterOp = op as FilterOp

  if (filterOp === 'is_null' || filterOp === 'is_not_null') {
    if (value !== undefined) {
      return { ok: false, error: `value must be absent for op '${filterOp}'` }
    }
    return { ok: true, node: { field, fieldType, op: filterOp } }
  }

  if (filterOp === 'is_between') {
    if (!Array.isArray(value) || value.length !== 2) {
      return { ok: false, error: 'is_between requires value to be a 2-element array' }
    }

    const [valueA, valueB] = value

    if (fieldType === 'float') {
      if (typeof valueA !== 'number' || typeof valueB !== 'number') {
        return { ok: false, error: 'is_between for float requires both values to be numbers' }
      }
      if (valueA > valueB) {
        return { ok: false, error: 'is_between requires a ≤ b' }
      }
      return {
        ok: true,
        node: { field, fieldType, op: filterOp, value: [valueA, valueB] },
      }
    }

    if (fieldType === 'datetime') {
      if (!isValidIso8601(valueA) || !isValidIso8601(valueB)) {
        return {
          ok: false,
          error: 'is_between for datetime requires both values to be valid ISO 8601 strings',
        }
      }
      if (new Date(valueA) > new Date(valueB)) {
        return { ok: false, error: 'is_between requires a ≤ b' }
      }
      return {
        ok: true,
        node: { field, fieldType, op: filterOp, value: [valueA, valueB] },
      }
    }
  }

  if (value === undefined || value === null) {
    return { ok: false, error: `value is required for op '${filterOp}'` }
  }

  if (fieldType === 'string' || fieldType === 'string_nullable') {
    if (typeof value !== 'string') {
      return { ok: false, error: `value must be a string for field type '${fieldType}'` }
    }
  } else if (fieldType === 'float') {
    if (typeof value !== 'number') {
      return { ok: false, error: `value must be a number for field type 'float'` }
    }
  } else if (fieldType === 'boolean') {
    if (typeof value !== 'boolean') {
      return { ok: false, error: `value must be a boolean for field type 'boolean'` }
    }
  } else if (fieldType === 'datetime') {
    if (!isValidIso8601(value)) {
      return { ok: false, error: `value must be a valid ISO 8601 string for field type 'datetime'` }
    }
  }

  return {
    ok: true,
    node: { field, fieldType, op: filterOp, value: value as FilterValue },
  }
}

export const buildWhereClause = (node: FilterNode): Record<string, unknown> => {
  if ('logic' in node) {
    const group = node as FilterGroup
    return {
      [group.logic]: group.conditions.map(buildWhereClause),
    }
  }

  const condition = node as FilterCondition
  const { field, fieldType, op, value } = condition

  const toDate = (dateValue: unknown) => new Date(dateValue as string)

  switch (op) {
    case 'is_equal':
      return {
        [field]: { equals: fieldType === 'datetime' ? toDate(value) : value },
      }
    case 'is_not_equal':
      return {
        [field]: { not: fieldType === 'datetime' ? toDate(value) : value },
      }
    case 'is_contains':
      return { [field]: { contains: value, mode: 'insensitive' } }
    case 'is_starts_with':
      return { [field]: { startsWith: value, mode: 'insensitive' } }
    case 'is_ends_with':
      return { [field]: { endsWith: value, mode: 'insensitive' } }
    case 'is_null':
      return { [field]: null }
    case 'is_not_null':
      return { [field]: { not: null } }
    case 'is_greater':
      return { [field]: { gt: fieldType === 'datetime' ? toDate(value) : value } }
    case 'is_greater_or_equal':
      return { [field]: { gte: fieldType === 'datetime' ? toDate(value) : value } }
    case 'is_lower':
      return { [field]: { lt: fieldType === 'datetime' ? toDate(value) : value } }
    case 'is_lower_or_equal':
      return { [field]: { lte: fieldType === 'datetime' ? toDate(value) : value } }
    case 'is_between': {
      const [valueA, valueB] = value as [number, number] | [string, string]
      return {
        [field]: {
          gte: fieldType === 'datetime' ? toDate(valueA) : valueA,
          lte: fieldType === 'datetime' ? toDate(valueB) : valueB,
        },
      }
    }
    case 'is_before':
      return { [field]: { lt: toDate(value) } }
    case 'is_after':
      return { [field]: { gt: toDate(value) } }
  }
}
