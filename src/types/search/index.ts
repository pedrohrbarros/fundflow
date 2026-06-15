const pagination = {
  page: { type: 'integer', minimum: 1, default: 1, description: 'Page number' },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Items per page' },
}

const filterGroup = {
  title: 'FilterGroup',
  type: 'object',
  required: ['logic', 'conditions'],
  properties: {
    logic: { type: 'string', enum: ['AND', 'OR'] },
    conditions: {
      type: 'array',
      description: 'Array of FilterCondition or nested FilterGroup objects',
      items: { type: 'object' },
    },
  },
}

function searchBody(conditionSchema: object) {
  return {
    type: 'object',
    properties: {
      ...pagination,
      filters: {
        description: 'Optional filter — either a single condition or a group of conditions',
        oneOf: [conditionSchema, filterGroup],
      },
    },
  }
}

export const CategorySearchBody = searchBody({
  title: 'FilterCondition',
  type: 'object',
  required: ['field', 'op'],
  properties: {
    field: {
      type: 'string',
      enum: ['name', 'type', 'created_at', 'updated_at'],
      description:
        'name → is_equal, is_not_equal, is_contains, is_starts_with, is_ends_with | type → is_equal, is_not_equal (value: INCOME | EXPENSE) | created_at/updated_at → is_equal, is_before, is_after, is_between',
    },
    op: {
      type: 'string',
      enum: [
        'is_equal',
        'is_not_equal',
        'is_contains',
        'is_starts_with',
        'is_ends_with',
        'is_before',
        'is_after',
        'is_between',
      ],
    },
    value: {
      description:
        'string for name; ISO 8601 string for datetime; [ISO, ISO] tuple for is_between; omit for is_null/is_not_null',
    },
  },
})

export const SourceOfIncomeSearchBody = searchBody({
  title: 'FilterCondition',
  type: 'object',
  required: ['field', 'op'],
  properties: {
    field: {
      type: 'string',
      enum: ['name', 'income', 'currency', 'created_at', 'updated_at'],
      description:
        'name/currency → is_equal, is_not_equal, is_contains, is_starts_with, is_ends_with | income → is_equal, is_not_equal, is_greater, is_greater_or_equal, is_lower, is_lower_or_equal, is_between | created_at/updated_at → is_equal, is_before, is_after, is_between',
    },
    op: {
      type: 'string',
      enum: [
        'is_equal',
        'is_not_equal',
        'is_contains',
        'is_starts_with',
        'is_ends_with',
        'is_greater',
        'is_greater_or_equal',
        'is_lower',
        'is_lower_or_equal',
        'is_between',
        'is_before',
        'is_after',
      ],
    },
    value: {
      description:
        'string for name/currency; number for income; ISO 8601 string for datetime; [a, b] tuple for is_between',
    },
  },
})

export const PaymentMethodSearchBody = searchBody({
  title: 'FilterCondition',
  type: 'object',
  required: ['field', 'op'],
  properties: {
    field: {
      type: 'string',
      enum: ['name', 'origin', 'receiver', 'created_at', 'updated_at'],
      description:
        'name/origin → is_equal, is_not_equal, is_contains, is_starts_with, is_ends_with | receiver → same + is_null, is_not_null | created_at/updated_at → is_equal, is_before, is_after, is_between',
    },
    op: {
      type: 'string',
      enum: [
        'is_equal',
        'is_not_equal',
        'is_contains',
        'is_starts_with',
        'is_ends_with',
        'is_null',
        'is_not_null',
        'is_before',
        'is_after',
        'is_between',
      ],
    },
    value: {
      description:
        'string for name/origin/receiver; ISO 8601 string for datetime; [ISO, ISO] tuple for is_between; omit for is_null/is_not_null',
    },
  },
})

export const ExpenseSearchBody = searchBody({
  title: 'FilterCondition',
  type: 'object',
  required: ['field', 'op'],
  properties: {
    field: {
      type: 'string',
      enum: [
        'name',
        'amount',
        'is_paid',
        'is_saved',
        'saving_location',
        'created_at',
        'updated_at',
      ],
      description:
        'name → is_equal, is_not_equal, is_contains, is_starts_with, is_ends_with | amount → is_equal, is_not_equal, is_greater, is_greater_or_equal, is_lower, is_lower_or_equal, is_between | is_paid/is_saved → is_equal | saving_location → string ops + is_null, is_not_null | created_at/updated_at → is_equal, is_before, is_after, is_between',
    },
    op: {
      type: 'string',
      enum: [
        'is_equal',
        'is_not_equal',
        'is_contains',
        'is_starts_with',
        'is_ends_with',
        'is_null',
        'is_not_null',
        'is_greater',
        'is_greater_or_equal',
        'is_lower',
        'is_lower_or_equal',
        'is_between',
        'is_before',
        'is_after',
      ],
    },
    value: {
      description:
        'string for name/saving_location; number for amount; boolean for is_paid/is_saved; ISO 8601 string for datetime; [a, b] tuple for is_between; omit for is_null/is_not_null',
    },
  },
})
