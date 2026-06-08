import { describe, it, expect, afterEach, afterAll } from 'bun:test'
import { db } from '../../config/db'
import { DocsService, TEST_USER_PREFIX } from '../../services/docs'

const TEST_PREFIX = TEST_USER_PREFIX

async function cleanupTestUsers() {
  const users = await db.user.findMany({
    where: { external_id: { startsWith: TEST_PREFIX } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  if (ids.length === 0) return
  await db.sourceOfIncomeCategory.deleteMany({ where: { user_id: { in: ids } } })
  await db.user.deleteMany({ where: { id: { in: ids } } })
}

afterEach(cleanupTestUsers)
afterAll(cleanupTestUsers)

describe('DocsService.findOrCreateMonthlyTestUser', () => {
  it('creates a user with the current month key on first call', async () => {
    const result = await DocsService.findOrCreateMonthlyTestUser()

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const now = new Date()
    const expected = `${TEST_PREFIX}${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(result.data.external_id).toBe(expected)
  })

  it('returns the same user on repeated calls within the same month', async () => {
    const first = await DocsService.findOrCreateMonthlyTestUser()
    const second = await DocsService.findOrCreateMonthlyTestUser()

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    expect(first.data.external_id).toBe(second.data.external_id)
  })

  it('deletes old test users when a new month key is needed', async () => {
    await db.user.create({ data: { external_id: 'docs-test-user-2020-01' } })

    const now = new Date()
    const currentKey = `${TEST_PREFIX}${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await db.user.deleteMany({ where: { external_id: currentKey } })

    await DocsService.findOrCreateMonthlyTestUser()

    const stale = await db.user.findUnique({ where: { external_id: 'docs-test-user-2020-01' } })
    expect(stale).toBeNull()

    const current = await db.user.findUnique({ where: { external_id: currentKey } })
    expect(current).not.toBeNull()
  })
})
