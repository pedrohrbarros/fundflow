import { describe, it, expect, afterEach, beforeEach } from 'bun:test'
import { db } from '../../config/db'

const TS = Date.now()
const TEST_EXTERNAL_ID = `user_income_test_${TS}`
const CATEGORY_NAME = `cat_join_${TS}`
const SOURCE_NAME = `source_join_${TS}`

describe('UserSourceOfIncome model', () => {
  let userId: bigint
  let sourceId: bigint

  beforeEach(async () => {
    const user = await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
    userId = user.id

    const category = await db.sourceOfIncomeCategory.create({ data: { name: CATEGORY_NAME } })
    const source = await db.sourceOfIncome.create({
      data: { name: SOURCE_NAME, category_id: category.id },
    })
    sourceId = source.id
  })

  afterEach(async () => {
    await db.userSourceOfIncome.deleteMany({ where: { user_id: userId } })
    await db.sourceOfIncome.deleteMany({ where: { name: SOURCE_NAME } })
    await db.sourceOfIncomeCategory.deleteMany({ where: { name: CATEGORY_NAME } })
    await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
    await db.$disconnect()
  })

  it('links a user to a source of income', async () => {
    const link = await db.userSourceOfIncome.create({
      data: { user_id: userId, source_of_income_id: sourceId },
    })

    expect(link.user_id).toBe(userId)
    expect(link.source_of_income_id).toBe(sourceId)
  })

  it('prevents duplicate user-source links', async () => {
    await db.userSourceOfIncome.create({
      data: { user_id: userId, source_of_income_id: sourceId },
    })

    let threw = false
    try {
      await db.userSourceOfIncome.create({
        data: { user_id: userId, source_of_income_id: sourceId },
      })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('fetches a user with their sources of income', async () => {
    await db.userSourceOfIncome.create({
      data: { user_id: userId, source_of_income_id: sourceId },
    })

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { sources_of_income: { include: { source_of_income: true } } },
    })

    expect(user?.sources_of_income).toHaveLength(1)
    expect(user?.sources_of_income[0].source_of_income.name).toBe(SOURCE_NAME)
  })
})
