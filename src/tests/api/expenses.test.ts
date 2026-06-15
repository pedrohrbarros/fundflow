import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_exp_test_${Date.now()}`
const TS = Date.now()

const makeToken = () =>
  new SignJWT({ azp: process.env.CLERK_AUTHORIZED_PARTY })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(TEST_EXTERNAL_ID)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(testPrivateKey)

const req = async (method: string, path: string, body?: unknown) => {
  const token = await makeToken()
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.API_TOKEN!,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

let pm_id: number
let exp_category_id: number

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
  const pm = await (
    await req('POST', '/api/v1/payment_methods', { name: `test-pm-${TS}`, origin: 'Test Bank' })
  ).json()
  pm_id = pm.id
  const cat = await (
    await req('POST', '/api/v1/categories', { name: `test-exp-cat-${TS}`, type: 'EXPENSE' })
  ).json()
  exp_category_id = cat.id
})

afterAll(async () => {
  await db.expense.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.paymentMethod.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.category.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Expenses API', () => {
  it('POST /api/v1/expenses creates an expense without splits', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-no-split`,
      category_id: Number(exp_category_id),
      amount: 100,
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`exp-${TS}-no-split`)
    expect(json.category_id).toBe(exp_category_id)
    expect(json.amount).toBe(100)
    expect(json.is_paid).toBe(false)
    expect(json.is_saved).toBe(false)
    expect(json.saving_location).toBeNull()
    expect(json.payment_methods).toEqual([])
    expect(json.created_at).toBeDefined()
    expect(json.updated_at).toBeDefined()
  })

  it('POST /api/v1/expenses creates an expense with splits', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-split`,
      category_id: Number(exp_category_id),
      amount: 100,
      is_paid: true,
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 100 }],
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.payment_methods).toHaveLength(1)
    expect(json.payment_methods[0].payment_method_id).toBe(pm_id)
    expect(json.payment_methods[0].partial_amount).toBe(100)
    expect(json.is_paid).toBe(true)
  })

  it('POST /api/v1/expenses returns 400 when splits do not sum to amount', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-bad-split`,
      category_id: Number(exp_category_id),
      amount: 100,
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 50 }],
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/expenses returns 404 for unknown payment method', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-unknown-pm`,
      category_id: Number(exp_category_id),
      amount: 100,
      payment_methods: [{ payment_method_id: 999999999, partial_amount: 100 }],
    })
    expect(res.status).toBe(404)
  })

  it('rejects an expense that references an INCOME category', async () => {
    const cat = await (
      await req('POST', '/api/v1/categories', { name: `exp-inc-${TS}`, type: 'INCOME' })
    ).json()
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-inc-cat`,
      category_id: Number(cat.id),
      amount: 10,
    })
    expect(res.status).toBe(404)
  })

  it('PATCH /api/v1/expenses/:id rejects switching to an INCOME category', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-patch-cat`,
        category_id: Number(exp_category_id),
        amount: 20,
      })
    ).json()
    const incomeCat = await (
      await req('POST', '/api/v1/categories', { name: `exp-patch-inc-${TS}`, type: 'INCOME' })
    ).json()
    const res = await req('PATCH', `/api/v1/expenses/${created.id}`, {
      category_id: Number(incomeCat.id),
    })
    expect(res.status).toBe(404)
  })

  it('POST /api/v1/expenses/search returns paginated expenses with full payment method data', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-list`,
      category_id: Number(exp_category_id),
      amount: 100,
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 100 }],
    })
    const res = await req('POST', '/api/v1/expenses/search', { page: 1, limit: 20 })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.expenses)).toBe(true)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.limit).toBe(20)
    expect(typeof json.pagination.total).toBe('number')
    // Find the expense we just created
    const expense = json.expenses.find((e: { name: string }) => e.name === `exp-${TS}-list`)
    expect(expense).toBeDefined()
    expect(expense.payment_methods).toHaveLength(1)
    // Each payment method entry must include full data
    const split = expense.payment_methods[0]
    expect(split.payment_method_id).toBe(pm_id)
    expect(typeof split.partial_amount).toBe('number')
    expect(typeof split.name).toBe('string')
    expect('origin' in split).toBe(true)
    expect('receiver' in split).toBe(true)
  })

  it('PATCH /api/v1/expenses/:id updates expense fields', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-patch-old`,
        category_id: Number(exp_category_id),
        amount: 50,
      })
    ).json()
    const res = await req('PATCH', `/api/v1/expenses/${created.id}`, {
      name: `exp-${TS}-patch-new`,
      is_saved: true,
      saving_location: 'Piggy bank',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`exp-${TS}-patch-new`)
    expect(json.is_saved).toBe(true)
    expect(json.saving_location).toBe('Piggy bank')
    expect(json.amount).toBe(50)
  })

  it('PATCH /api/v1/expenses/:id replaces splits atomically', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-split-replace`,
        category_id: Number(exp_category_id),
        amount: 100,
        payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 100 }],
      })
    ).json()
    const res = await req('PATCH', `/api/v1/expenses/${created.id}`, { payment_methods: [] })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.payment_methods).toEqual([])
  })

  it('PATCH /api/v1/expenses/:id returns 400 when new splits do not sum to amount', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-bad-patch`,
        category_id: Number(exp_category_id),
        amount: 100,
      })
    ).json()
    const res = await req('PATCH', `/api/v1/expenses/${created.id}`, {
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 50 }],
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/expenses/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/api/v1/expenses/999999999', { name: 'x' })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/expenses/:id deletes an expense', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-del`,
        category_id: Number(exp_category_id),
        amount: 10,
      })
    ).json()
    const res = await req('DELETE', `/api/v1/expenses/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /api/v1/expenses/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/api/v1/expenses/999999999')
    expect(res.status).toBe(404)
  })

  it('POST /api/v1/expenses/search with limit=5001 returns 400', async () => {
    const res = await req('POST', '/api/v1/expenses/search', { limit: 5001 })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/expenses/search with is_equal filter returns only matching expenses', async () => {
    const name = `exp-${TS}-filter-eq`
    await req('POST', '/api/v1/expenses', {
      name,
      category_id: Number(exp_category_id),
      amount: 50,
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-filter-other`,
      category_id: Number(exp_category_id),
      amount: 50,
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      filters: { field: 'name', op: 'is_equal', value: name },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses.every((e: { name: string }) => e.name === name)).toBe(true)
    expect(json.expenses.length).toBeGreaterThan(0)
  })

  it('POST /api/v1/expenses/search with is_between filter returns only in-range expenses', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-range-low`,
      category_id: Number(exp_category_id),
      amount: 10,
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-range-mid`,
      category_id: Number(exp_category_id),
      amount: 150,
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-range-high`,
      category_id: Number(exp_category_id),
      amount: 500,
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      filters: { field: 'amount', op: 'is_between', value: [100, 200] },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses.every((e: { amount: number }) => e.amount >= 100 && e.amount <= 200)).toBe(
      true
    )
  })

  it('POST /api/v1/expenses/search with unknown field returns 400', async () => {
    const res = await req('POST', '/api/v1/expenses/search', {
      filters: { field: 'nonexistent', op: 'is_equal', value: 'x' },
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/expenses/search with op invalid for field type returns 400', async () => {
    const res = await req('POST', '/api/v1/expenses/search', {
      filters: { field: 'is_paid', op: 'is_contains', value: 'x' },
    })
    expect(res.status).toBe(400)
  })
})
