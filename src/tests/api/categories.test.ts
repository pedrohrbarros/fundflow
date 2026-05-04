import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { generateKeyPair, SignJWT } from 'jose'
import { db } from '../../config/db'

const { privateKey: testPrivateKey, publicKey: testPublicKey } = await generateKeyPair('RS256')

mock.module('../../config/clerk', () => ({
  getClerkPublicKey: async () => testPublicKey,
}))

process.env.CLERK_AUTHORIZED_PARTY = 'http://localhost:3000'

const { app } = await import('../../index')

const TEST_EXTERNAL_ID = `user_cat_api_${Date.now()}`
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
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  )
}

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
})

afterAll(async () => {
  await db.sourceOfIncomeCategory.deleteMany({ where: { user: { external_id: TEST_EXTERNAL_ID } } })
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('Categories API', () => {
  it('POST /v1/categories creates a category', async () => {
    const res = await req('POST', '/v1/categories', { name: `test-cat-${TS}-create` })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.name).toBe(`test-cat-${TS}-create`)
    expect(json.created_at).toBeDefined()
    expect(json.updated_at).toBeDefined()
  })

  it("GET /v1/categories returns only the user's categories", async () => {
    await req('POST', '/v1/categories', { name: `test-cat-${TS}-list` })
    const res = await req('GET', '/v1/categories')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.categories)).toBe(true)
    expect(json.categories.some((c: { name: string }) => c.name === `test-cat-${TS}-list`)).toBe(
      true
    )
  })

  it('PATCH /v1/categories/:id updates a category', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cat-${TS}-patch-old` })
    ).json()
    const res = await req('PATCH', `/v1/categories/${created.id}`, {
      name: `test-cat-${TS}-patch-new`,
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe(`test-cat-${TS}-patch-new`)
  })

  it('PATCH /v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('PATCH', '/v1/categories/999999999', { name: `test-cat-${TS}-x` })
    expect(res.status).toBe(404)
  })

  it('DELETE /v1/categories/:id deletes a category', async () => {
    const created = await (
      await req('POST', '/v1/categories', { name: `test-cat-${TS}-del` })
    ).json()
    const res = await req('DELETE', `/v1/categories/${created.id}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
  })

  it('DELETE /v1/categories/:id returns 404 for unknown id', async () => {
    const res = await req('DELETE', '/v1/categories/999999999')
    expect(res.status).toBe(404)
  })

  it('POST /v1/categories returns 400 when user has 100 categories', async () => {
    const user = await db.user.findUnique({ where: { external_id: TEST_EXTERNAL_ID } })
    await db.sourceOfIncomeCategory.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        name: `limit-cat-${TS}-${i}`,
        user_id: user!.id,
      })),
    })
    const res = await req('POST', '/v1/categories', { name: `test-cat-${TS}-over-limit` })
    expect(res.status).toBe(400)
    await db.sourceOfIncomeCategory.deleteMany({
      where: { name: { startsWith: `limit-cat-${TS}` } },
    })
  })
})
