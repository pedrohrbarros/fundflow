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
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

export const SourceOfIncomeResponse = source_of_income

export const SourceOfIncomeSearchResponse = {
  type: 'object',
  properties: {
    sources_of_income: {
      type: 'object',
      description: 'Sources of income grouped by category name',
      additionalProperties: { type: 'array', items: source_of_income },
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
    is_paid: { type: 'boolean' },
    is_saved: { type: 'boolean' },
    saving_location: { type: 'string', nullable: true },
    payment_methods: { type: 'array', items: expense_payment_method },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

export const ExpenseResponse = expense

export const ExpenseSearchResponse = {
  type: 'object',
  properties: {
    expenses: { type: 'array', items: expense },
    pagination,
  },
}

export const UserResponse = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    country: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}
