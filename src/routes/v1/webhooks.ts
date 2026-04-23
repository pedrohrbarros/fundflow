import { Elysia } from 'elysia'
import { db } from '../../config/db'

type ClerkUserCreatedPayload = {
  data: { id: string }
  type: string
}

export const webhooks = new Elysia().post(
  '/webhooks/clerk/user-created/listener',
  async ({ body, set }) => {
    const payload = body as ClerkUserCreatedPayload

    const external_id = payload?.data?.id
    if (!external_id) {
      set.status = 400
      return { error: 'Missing user id in webhook payload' }
    }

    const user = await db.user.create({
      data: { external_id },
    })

    set.status = 201
    return { id: user.id.toString(), external_id: user.external_id }
  }
)
