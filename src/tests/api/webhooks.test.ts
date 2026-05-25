import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import { db } from '../../config/db'

const TEST_EXTERNAL_ID = `user_wh_delete_test_${Date.now()}`

mock.module('../../helpers/webhooks/auth/svix', () => ({
  verifySvixSignature: () => ({ success: true }),
}))

process.env.API_TOKEN = 'test-api-token'

const { app } = await import('../../index')

const ALLOWED_CLERK_IP = '44.228.126.217'

const makeDeleteRequest = (payload: unknown) =>
  app.handle(
    new Request('http://localhost/api/v1/webhooks/clerk/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        'x-forwarded-for': ALLOWED_CLERK_IP,
        'svix-id': 'msg_test',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,test',
      },
      body: JSON.stringify(payload),
    })
  )

beforeAll(async () => {
  await db.user.create({ data: { external_id: TEST_EXTERNAL_ID } })
})

afterAll(async () => {
  await db.user.deleteMany({ where: { external_id: TEST_EXTERNAL_ID } })
  await db.$disconnect()
})

describe('POST /webhooks/clerk/delete', () => {
  it('deletes the user and returns 200 with the external_id', async () => {
    const payload = {
      data: { deleted: true, id: TEST_EXTERNAL_ID, object: 'user' },
      event_attributes: {
        http_request: { client_ip: '0.0.0.0', user_agent: 'test' },
      },
      object: 'event',
      timestamp: Date.now(),
      type: 'user.deleted',
    }

    const response = await makeDeleteRequest(payload)
    expect(response.status).toBe(204)

    const user = await db.user.findFirst({ where: { external_id: TEST_EXTERNAL_ID } })
    expect(user).toBeNull()
  })
})
