import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '../../config/db'

const TEST_NAME = `category_test_${Date.now()}`

describe('SourceOfIncomeCategory model', () => {
  afterEach(async () => {
    await db.sourceOfIncomeCategory.deleteMany({ where: { name: TEST_NAME } })
    await db.$disconnect()
  })

  it('creates a category with a name', async () => {
    const category = await db.sourceOfIncomeCategory.create({
      data: { name: TEST_NAME },
    })

    expect(category.id).toBeDefined()
    expect(typeof category.id).toBe('bigint')
    expect(category.name).toBe(TEST_NAME)
  })
})
