import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import type { ClerkUserCreatedPayload } from '../../../../types/webhooks/clerk'

export const clerkUserCreatedListenerWebhook = async ({ body, set }: Context) => {
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
