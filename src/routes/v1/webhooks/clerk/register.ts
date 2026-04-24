import type { Context } from 'elysia'
import { verifyWebhook } from '@clerk/backend/webhooks'
import { db } from '../../../../config/db'

export const clerkRegisterWebhook = async ({ request, body, set }: Context) => {
  const clerkRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: body as string,
  })

  let event
  try {
    event = await verifyWebhook(clerkRequest, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    })
  } catch {
    set.status = 400
    return { error: 'Webhook verification failed' }
  }

  if (event.type !== 'user.created') {
    return { message: 'Event ignored' }
  }

  const externalId = event.data.id
  if (!externalId) {
    set.status = 400
    return { error: 'Missing user id in webhook payload' }
  }

  const user = await db.user.create({
    data: { external_id: externalId },
  })

  set.status = 201
  return { id: user.id.toString(), externalId: user.external_id }
}
