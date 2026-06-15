import { describe, it, expect, afterEach, beforeEach } from 'bun:test'
import { db } from '../../config/db'

const TS = Date.now()
const CATEGORY_NAME = `cat_for_income_${TS}`
const SOURCE_NAME = `source_test_${TS}`
const TEST_USER = `user_soi_db_${TS}`

describe('SourceOfIncome model', () => {
  let userId: bigint
  let categoryId: bigint

  beforeEach(async () => {
    const user = await db.user.create({ data: { external_id: TEST_USER } })
    userId = user.id
    const category = await db.category.create({
      data: { name: CATEGORY_NAME, type: 'INCOME', user_id: userId },
    })
    categoryId = category.id
  })

  afterEach(async () => {
    await db.sourceOfIncome.deleteMany({ where: { name: SOURCE_NAME } })
    await db.category.deleteMany({ where: { name: CATEGORY_NAME } })
    await db.user.deleteMany({ where: { external_id: TEST_USER } })
    await db.$disconnect()
  })

  it('creates a source of income with name, category, user, and default income', async () => {
    const source = await db.sourceOfIncome.create({
      data: { name: SOURCE_NAME, category_id: categoryId, user_id: userId },
    })

    expect(source.id).toBeDefined()
    expect(typeof source.id).toBe('bigint')
    expect(source.name).toBe(SOURCE_NAME)
    expect(source.category_id).toBe(categoryId)
    expect(source.user_id).toBe(userId)
    expect(source.income).toBe(0)
    expect(source.created_at).toBeInstanceOf(Date)
  })

  it('creates a source of income with a custom income value', async () => {
    const source = await db.sourceOfIncome.create({
      data: { name: SOURCE_NAME, category_id: categoryId, user_id: userId, income: 5000.5 },
    })

    expect(source.income).toBe(5000.5)
  })
})
