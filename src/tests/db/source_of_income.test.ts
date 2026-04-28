import { describe, it, expect, afterEach, beforeEach } from 'bun:test'
import { db } from '../../config/db'

const CATEGORY_NAME = `cat_for_income_${Date.now()}`
const SOURCE_NAME = `source_test_${Date.now()}`

describe('SourceOfIncome model', () => {
  let categoryId: bigint

  beforeEach(async () => {
    const category = await db.sourceOfIncomeCategory.create({
      data: { name: CATEGORY_NAME },
    })
    categoryId = category.id
  })

  afterEach(async () => {
    await db.sourceOfIncome.deleteMany({ where: { name: SOURCE_NAME } })
    await db.sourceOfIncomeCategory.deleteMany({ where: { name: CATEGORY_NAME } })
    await db.$disconnect()
  })

  it('creates a source of income with name, category, and default income', async () => {
    const source = await db.sourceOfIncome.create({
      data: { name: SOURCE_NAME, category_id: categoryId },
    })

    expect(source.id).toBeDefined()
    expect(typeof source.id).toBe('bigint')
    expect(source.name).toBe(SOURCE_NAME)
    expect(source.category_id).toBe(categoryId)
    expect(source.income).toBe(0)
  })

  it('creates a source of income with a custom income value', async () => {
    const source = await db.sourceOfIncome.create({
      data: { name: SOURCE_NAME, category_id: categoryId, income: 5000.5 },
    })

    expect(source.income).toBe(5000.5)
  })
})
