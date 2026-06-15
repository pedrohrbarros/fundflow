import { describe, it, expect, afterEach, beforeEach } from 'bun:test'
import { db } from '../../config/db'

const TS = Date.now()
const TEST_NAME = `category_test_${TS}`
const TEST_USER = `user_cat_db_${TS}`

describe('Category model', () => {
  let userId: bigint

  beforeEach(async () => {
    const user = await db.user.create({ data: { external_id: TEST_USER } })
    userId = user.id
  })

  afterEach(async () => {
    await db.category.deleteMany({ where: { name: TEST_NAME } })
    await db.user.deleteMany({ where: { external_id: TEST_USER } })
    await db.$disconnect()
  })

  it('creates a category with a name, type and user', async () => {
    const category = await db.category.create({
      data: { name: TEST_NAME, type: 'INCOME', user_id: userId },
    })

    expect(category.id).toBeDefined()
    expect(typeof category.id).toBe('bigint')
    expect(category.name).toBe(TEST_NAME)
    expect(category.type).toBe('INCOME')
    expect(category.user_id).toBe(userId)
    expect(category.created_at).toBeInstanceOf(Date)
    expect(category.updated_at).toBeInstanceOf(Date)
  })
})
