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

let pm_id: string

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
  const pm = await (await req('POST', '/api/v1/payment_methods', { name: `test-pm-${TS}` })).json()
  pm_id = pm.id
})

afterAll(async () => {
  await db.expense.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.paymentMethod.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Expenses API', () => {
  it('POST /api/v1/expenses creates an expense without splits', async () => {
    const res = await req('POST', '/api/v1/expenses', { name: `exp-${TS}-no-split`, amount: 100 })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`exp-${TS}-no-split`)
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
      amount: 100,
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 50 }],
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/expenses returns 404 for unknown payment method', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-unknown-pm`,
      amount: 100,
      payment_methods: [{ payment_method_id: 999999999, partial_amount: 100 }],
    })
    expect(res.status).toBe(404)
  })

  it('GET /api/v1/expenses returns paginated expenses with full payment method data', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-list`,
      amount: 100,
      payment_methods: [{ payment_method_id: Number(pm_id), partial_amount: 100 }],
    })
    const res = await req('GET', '/api/v1/expenses?page=1&limit=20')
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
    expect('bank' in split).toBe(true)
    expect('receiver' in split).toBe(true)
  })

  it('PATCH /api/v1/expenses/:id updates expense fields', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', { name: `exp-${TS}-patch-old`, amount: 50 })
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
      await req('POST', '/api/v1/expenses', { name: `exp-${TS}-bad-patch`, amount: 100 })
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
      await req('POST', '/api/v1/expenses', { name: `exp-${TS}-del`, amount: 10 })
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
})
