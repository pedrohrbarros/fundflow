import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '../../config/db'

const TEST_EXTERNAL_ID = `user_test_${Date.now()}`

describe('User model', () => {
  afterEach(async () => {
    await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
    await db.$disconnect()
  })

  it('creates a user with an external_id', async () => {
    const user = await db.user.create({
      data: { external_id: TEST_EXTERNAL_ID, email: `${TEST_EXTERNAL_ID}@test.local` },
    })

    expect(user.id).toBeDefined()
    expect(typeof user.id).toBe('bigint')
    expect(user.external_id).toBe(TEST_EXTERNAL_ID)
  })
})
