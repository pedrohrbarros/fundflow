const pagination = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
  },
}

export const DeletedResponse = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
}

const category = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

export const CategoryResponse = category

export const CategorySearchResponse = {
  type: 'object',
  properties: {
    categories: { type: 'array', items: category },
    pagination,
  },
}

const source_of_income = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    category_id: { type: 'number' },
    income: { type: 'number' },
    currency: { type: 'string' },
    date: { type: 'string', format: 'date' },
    is_recurring: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

const source_of_income_search_record = {
  type: 'object',
  properties: {
    ...source_of_income.properties,
    period_amount: { type: 'number', description: 'Amount applicable in the requested period' },
  },
}

export const SourceOfIncomeResponse = source_of_income

export const SourceOfIncomeSearchResponse = {
  type: 'object',
  properties: {
    sources_of_income: {
      type: 'object',
      description: 'Sources of income grouped by category name',
      additionalProperties: { type: 'array', items: source_of_income_search_record },
    },
    total: {
      type: 'object',
      description: 'Sum of period_amount per currency code (e.g. { "USD": 5000, "EUR": 1000 })',
      additionalProperties: { type: 'number' },
    },
    pagination,
  },
}

const payment_method = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    origin: { type: 'string' },
    receiver: { type: 'string', nullable: true },
    user_id: { type: 'number' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

export const PaymentMethodResponse = payment_method

export const PaymentMethodSearchResponse = {
  type: 'object',
  properties: {
    payment_methods: { type: 'array', items: payment_method },
    pagination,
  },
}

const expense_payment_method = {
  type: 'object',
  properties: {
    payment_method_id: { type: 'number' },
    partial_amount: { type: 'number' },
    name: { type: 'string' },
    origin: { type: 'string' },
    receiver: { type: 'string', nullable: true },
  },
}

const expense = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    category_id: { type: 'number' },
    amount: { type: 'number' },
    date: { type: 'string', format: 'date' },
    is_recurring: { type: 'boolean' },
    is_paid: { type: 'boolean' },
    is_saved: { type: 'boolean' },
    saving_location: { type: 'string', nullable: true },
    payment_methods: { type: 'array', items: expense_payment_method },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

const expense_search_record = {
  type: 'object',
  properties: {
    ...expense.properties,
    period_amount: { type: 'number', description: 'Amount applicable in the requested period' },
  },
}

export const ExpenseResponse = expense

export const ExpenseSearchResponse = {
  type: 'object',
  properties: {
    expenses: { type: 'array', items: expense_search_record },
    total: { type: 'number', description: 'Sum of period_amount across all applicable expenses' },
    pagination,
  },
}

export const ExpenseByCategoryResponse = {
  type: 'object',
  properties: {
    by_category: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category_id: { type: 'number' },
          name: { type: 'string' },
          total: { type: 'number' },
          count: { type: 'number' },
        },
      },
    },
    total: { type: 'number' },
  },
}

export const UserResponse = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string' },
    country: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}
