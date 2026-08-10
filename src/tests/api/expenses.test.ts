import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { signAccessToken } from '../../helpers/auth/tokens'

process.env.JWT_SECRET = 'test-secret-value'
process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_exp_test_${Date.now()}`
const TEST_EMAIL = `${TEST_EXTERNAL_ID}@test.local`
const TS = Date.now()

const req = async (method: string, path: string, body?: unknown) => {
  const token = await signAccessToken({ external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL })
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

let pm_id: number
let exp_category_id: number

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID, email: TEST_EMAIL } })
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
  it('POST /api/v1/expenses creates an expense without a payment method', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-no-pm`,
      category_id: Number(exp_category_id),
      amount: 100,
      date: '2026-06-15',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`exp-${TS}-no-pm`)
    expect(json.category_id).toBe(exp_category_id)
    expect(json.amount).toBe(100)
    expect(json.is_paid).toBe(false)
    expect(json.is_saved).toBe(false)
    expect(json.saving_location).toBeNull()
    expect(json.payment_method_id).toBeNull()
    expect(json.payment_method).toBeNull()
    expect(json.date).toBe('2026-06-15')
    expect(json.is_recurring).toBe(false)
    expect(json.created_at).toBeDefined()
    expect(json.updated_at).toBeDefined()
  })

  it('POST /api/v1/expenses creates an expense with a payment method', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-pm`,
      category_id: Number(exp_category_id),
      amount: 100,
      date: '2026-06-15',
      is_paid: true,
      payment_method_id: Number(pm_id),
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.payment_method_id).toBe(pm_id)
    expect(json.payment_method.id).toBe(pm_id)
    expect(json.is_paid).toBe(true)
  })

  it('POST /api/v1/expenses returns 404 for unknown payment method', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-unknown-pm`,
      category_id: Number(exp_category_id),
      amount: 100,
      date: '2026-06-15',
      payment_method_id: 999999999,
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
      date: '2026-06-15',
    })
    expect(res.status).toBe(404)
  })

  it('PATCH /api/v1/expenses/:id rejects switching to an INCOME category', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-patch-cat`,
        category_id: Number(exp_category_id),
        amount: 20,
        date: '2026-06-15',
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
      date: '2026-06-15',
      payment_method_id: Number(pm_id),
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      page: 1,
      limit: 20,
      granularity: 'annually',
      date: '2026-06-15',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.expenses)).toBe(true)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.limit).toBe(20)
    expect(typeof json.pagination.total).toBe('number')
    // Find the expense we just created
    const expense = json.expenses.find((e: { name: string }) => e.name === `exp-${TS}-list`)
    expect(expense).toBeDefined()
    // The embedded payment method must carry its name and origin
    expect(expense.payment_method.id).toBe(pm_id)
    expect(typeof expense.payment_method.name).toBe('string')
    expect(typeof expense.payment_method.origin).toBe('string')
  })

  it('PATCH /api/v1/expenses/:id updates expense fields', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-patch-old`,
        category_id: Number(exp_category_id),
        amount: 50,
        date: '2026-06-15',
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

  it('PATCH /api/v1/expenses/:id clears the payment method with null', async () => {
    const created = await (
      await req('POST', '/api/v1/expenses', {
        name: `exp-${TS}-pm-clear`,
        category_id: Number(exp_category_id),
        amount: 100,
        date: '2026-06-15',
        payment_method_id: Number(pm_id),
      })
    ).json()
    const res = await req('PATCH', `/api/v1/expenses/${created.id}`, { payment_method_id: null })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.payment_method_id).toBeNull()
    expect(json.payment_method).toBeNull()
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
        date: '2026-06-15',
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
      date: '2026-06-15',
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-filter-other`,
      category_id: Number(exp_category_id),
      amount: 50,
      date: '2026-06-15',
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-06-15',
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
      date: '2026-06-15',
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-range-mid`,
      category_id: Number(exp_category_id),
      amount: 150,
      date: '2026-06-15',
    })
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-range-high`,
      category_id: Number(exp_category_id),
      amount: 500,
      date: '2026-06-15',
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

  it('search scopes to the period and returns period_amount + total', async () => {
    const cat = await (
      await req('POST', '/api/v1/categories', { name: `per-${TS}`, type: 'EXPENSE' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `one-time-${TS}`,
      category_id: Number(cat.id),
      amount: 100,
      date: '2026-06-10',
    })
    await req('POST', '/api/v1/expenses', {
      name: `recur-${TS}`,
      category_id: Number(cat.id),
      amount: 1000,
      date: '2026-06-05',
      is_recurring: true,
    })

    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'annually',
      date: '2026-09-01',
      filters: {
        logic: 'OR',
        conditions: [
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `one-time-${TS}` },
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `recur-${TS}` },
        ],
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    const recur = json.expenses.find((e: { name: string }) => e.name === `recur-${TS}`)
    expect(recur.period_amount).toBe(7000)
    expect(recur.is_recurring).toBe(true)
    expect(recur.date).toBe('2026-06-05')
    expect(json.total).toBe(7100)
    expect(json.pagination.total).toBe(2)
  }, 20000)

  it('search excludes records before a recurring anchor / outside the period', async () => {
    const cat = await (
      await req('POST', '/api/v1/categories', { name: `per2-${TS}`, type: 'EXPENSE' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `future-${TS}`,
      category_id: Number(cat.id),
      amount: 100,
      date: '2026-08-10',
      is_recurring: true,
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-07-15',
      filters: { field: 'name', fieldType: 'string', op: 'is_equal', value: `future-${TS}` },
    })
    const json = await res.json()
    expect(json.expenses.length).toBe(0)
    expect(json.total).toBe(0)
  }, 20000)

  it('POST /api/v1/expenses creates an expense without category_id (null)', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-no-cat`,
      amount: 75,
      date: '2026-06-15',
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.category_id).toBeNull()
  })

  it('by-category includes Uncategorized bucket for expenses without category', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `exp-${TS}-uncat-bc`,
      amount: 42,
      date: '2026-06-20',
    })
    const res = await req('POST', '/api/v1/expenses/by-category', {
      granularity: 'annually',
      date: '2026-09-01',
      filters: { field: 'name', fieldType: 'string', op: 'is_equal', value: `exp-${TS}-uncat-bc` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    const row = json.by_category.find((r: { category_id: number | null }) => r.category_id === null)
    expect(row).toBeDefined()
    expect(row.name).toBe('Uncategorized')
    expect(row.total).toBe(42)
    expect(row.count).toBe(1)
  }, 20000)

  it('search sorts by period_amount desc', async () => {
    const cat = await (
      await req('POST', '/api/v1/categories', { name: `srt-${TS}`, type: 'EXPENSE' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `srt-small-${TS}`,
      category_id: Number(cat.id),
      amount: 10,
      date: '2026-06-05',
      is_recurring: true,
    })
    await req('POST', '/api/v1/expenses', {
      name: `srt-big-${TS}`,
      category_id: Number(cat.id),
      amount: 1000,
      date: '2026-06-10',
    })
    // annual 2026: small recurring 10*7=70 ; big one-time 1000 -> big first when desc
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'annually',
      date: '2026-09-01',
      sort: { field: 'period_amount', direction: 'desc' },
      filters: {
        logic: 'OR',
        conditions: [
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `srt-small-${TS}` },
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `srt-big-${TS}` },
        ],
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].name).toBe(`srt-big-${TS}`)
    expect(json.expenses[0].period_amount).toBe(1000)
    expect(json.expenses[1].period_amount).toBe(70)
  }, 20000)
  it('search rejects an invalid sort field', async () => {
    const res = await req('POST', '/api/v1/expenses/search', { sort: { field: 'evil' } })
    expect(res.status).toBe(400)
  }, 20000)

  it('search sorts by payment_method_name asc', async () => {
    const pmA = await (
      await req('POST', '/api/v1/payment_methods', { name: `aaa-pm-${TS}`, origin: 'bank' })
    ).json()
    const pmZ = await (
      await req('POST', '/api/v1/payment_methods', { name: `zzz-pm-${TS}`, origin: 'bank' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `sort-pm-z-${TS}`,
      amount: 50,
      date: '2026-06-10',
      payment_method_id: Number(pmZ.id),
    })
    await req('POST', '/api/v1/expenses', {
      name: `sort-pm-a-${TS}`,
      amount: 50,
      date: '2026-06-10',
      payment_method_id: Number(pmA.id),
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-06-01',
      sort: { field: 'payment_method_name', direction: 'asc' },
      filters: {
        logic: 'OR',
        conditions: [
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `sort-pm-z-${TS}` },
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `sort-pm-a-${TS}` },
        ],
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].name).toBe(`sort-pm-a-${TS}`)
    expect(json.expenses[1].name).toBe(`sort-pm-z-${TS}`)
  }, 20000)

  it('search sorts by category_name asc', async () => {
    const catA = await (
      await req('POST', '/api/v1/categories', { name: `aaa-cat-${TS}`, type: 'EXPENSE' })
    ).json()
    const catZ = await (
      await req('POST', '/api/v1/categories', { name: `zzz-cat-${TS}`, type: 'EXPENSE' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `sort-cat-z-${TS}`,
      category_id: Number(catZ.id),
      amount: 50,
      date: '2026-06-10',
    })
    await req('POST', '/api/v1/expenses', {
      name: `sort-cat-a-${TS}`,
      category_id: Number(catA.id),
      amount: 50,
      date: '2026-06-10',
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-06-01',
      sort: { field: 'category_name', direction: 'asc' },
      filters: {
        logic: 'OR',
        conditions: [
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `sort-cat-z-${TS}` },
          { field: 'name', fieldType: 'string', op: 'is_equal', value: `sort-cat-a-${TS}` },
        ],
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].name).toBe(`sort-cat-a-${TS}`)
    expect(json.expenses[1].name).toBe(`sort-cat-z-${TS}`)
  }, 20000)

  it('create rejects recurring_months on non-recurring expense', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `rm-invalid-${TS}`,
      amount: 50,
      date: '2026-06-10',
      is_recurring: false,
      recurring_months: 3,
    })
    expect(res.status).toBe(400)
  }, 20000)

  it('create accepts recurring_months on recurring expense', async () => {
    const res = await req('POST', '/api/v1/expenses', {
      name: `rm-ok-${TS}`,
      amount: 100,
      date: '2026-06-01',
      is_recurring: true,
      recurring_months: 2,
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.recurring_months).toBe(2)
  }, 20000)

  it('search excludes recurring expense after its recurring_months window', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `rm-expired-${TS}`,
      amount: 50,
      date: '2026-06-01',
      is_recurring: true,
      recurring_months: 1,
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-07-01',
      filters: { field: 'name', fieldType: 'string', op: 'is_equal', value: `rm-expired-${TS}` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses).toHaveLength(0)
  }, 20000)

  it('annually sums only active months within recurring_months window', async () => {
    await req('POST', '/api/v1/expenses', {
      name: `rm-annual-${TS}`,
      amount: 100,
      date: '2026-01-01',
      is_recurring: true,
      recurring_months: 3,
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'annually',
      date: '2026-06-01',
      filters: { field: 'name', fieldType: 'string', op: 'is_equal', value: `rm-annual-${TS}` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].period_amount).toBe(300)
  }, 20000)

  it('by-category totals period_amount per category', async () => {
    const cat1 = await (
      await req('POST', '/api/v1/categories', { name: `bc1-${TS}`, type: 'EXPENSE' })
    ).json()
    await req('POST', '/api/v1/expenses', {
      name: `bca-${TS}`,
      category_id: Number(cat1.id),
      amount: 30,
      date: '2026-06-10',
    })
    await req('POST', '/api/v1/expenses', {
      name: `bcb-${TS}`,
      category_id: Number(cat1.id),
      amount: 1000,
      date: '2026-06-05',
      is_recurring: true,
    })

    // Annual 2026: 30 (one-time) + 1000*7 (recurring Jun..Dec) = 7030 for cat1
    const res = await req('POST', '/api/v1/expenses/by-category', {
      granularity: 'annually',
      date: '2026-09-01',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    const row = json.by_category.find(
      (r: { category_id: number }) => r.category_id === Number(cat1.id)
    )
    expect(row.total).toBe(7030)
    expect(row.count).toBe(2)
  }, 20000)

  it('search returns is_paid=true for recurring expense paid in the current period', async () => {
    const exp = await (
      await req('POST', '/api/v1/expenses', {
        name: `paid-period-match-${TS}`,
        amount: 100,
        date: '2026-06-01',
        is_recurring: true,
      })
    ).json()
    await req('PATCH', `/api/v1/expenses/${exp.id}`, {
      is_paid: true,
      paid_period: '2026-06',
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-06-15',
      filters: {
        field: 'name',
        fieldType: 'string',
        op: 'is_equal',
        value: `paid-period-match-${TS}`,
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].is_paid).toBe(true)
  }, 20000)

  it('search returns is_paid=false for recurring expense paid in a different period', async () => {
    const exp = await (
      await req('POST', '/api/v1/expenses', {
        name: `paid-period-mismatch-${TS}`,
        amount: 100,
        date: '2026-06-01',
        is_recurring: true,
      })
    ).json()
    await req('PATCH', `/api/v1/expenses/${exp.id}`, {
      is_paid: true,
      paid_period: '2026-06',
    })
    const res = await req('POST', '/api/v1/expenses/search', {
      granularity: 'monthly',
      date: '2026-07-15',
      filters: {
        field: 'name',
        fieldType: 'string',
        op: 'is_equal',
        value: `paid-period-mismatch-${TS}`,
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.expenses[0].is_paid).toBe(false)
  }, 20000)

  it('search drops is_paid and is_saved once a recurring expense rolls into the next period', async () => {
    const name = `paid-saved-rollover-${TS}`
    await req('POST', '/api/v1/expenses', {
      name,
      amount: 100,
      date: '2026-06-01',
      is_recurring: true,
      is_paid: true,
      is_saved: true,
    })
    const filters = { field: 'name', fieldType: 'string', op: 'is_equal', value: name }

    const june = await (
      await req('POST', '/api/v1/expenses/search', {
        granularity: 'monthly',
        date: '2026-06-15',
        filters,
      })
    ).json()
    expect(june.expenses[0].is_paid).toBe(true)
    expect(june.expenses[0].is_saved).toBe(true)

    const july = await (
      await req('POST', '/api/v1/expenses/search', {
        granularity: 'monthly',
        date: '2026-07-15',
        filters,
      })
    ).json()
    expect(july.expenses[0].is_paid).toBe(false)
    expect(july.expenses[0].is_saved).toBe(false)
  }, 20000)
})
