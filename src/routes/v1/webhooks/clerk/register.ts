import type { Context } from 'elysia'
import { db } from '../../../../config/db'
import { verifySvixSignature } from '../../../../helpers/webhooks/auth/svix'
import { handleError } from '../../../../middleware/error'
import type { ClerkUserCreatedEvent } from '../../../../types/webhooks/clerk'

export const clerkRegisterWebhook = async ({ request, body, set }: Context) => {
  const raw_body = body as string

  const verification = verifySvixSignature(
    raw_body,
    {
      'svix-id': request.headers.get('svix-id'),
      'svix-timestamp': request.headers.get('svix-timestamp'),
      'svix-signature': request.headers.get('svix-signature'),
    },
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? ''
  )

  if (!verification.success) {
    return handleError(set, 400, 'Webhook verification failed', { reason: verification.reason })
  }

  let event: ClerkUserCreatedEvent
  try {
    event = JSON.parse(raw_body) as ClerkUserCreatedEvent
  } catch (error) {
    return handleError(set, 400, 'Invalid JSON body', { error })
  }

  if (event.type !== 'user.created') {
    return { message: 'Event ignored' }
  }

  const external_id = event.data.id
  if (!external_id) {
    return handleError(set, 400, 'Missing user id in webhook payload', { event_type: event.type })
  }

  let user
  try {
    user = await db.user.create({
      data: { external_id },
    })
  } catch (err) {
    return handleError(set, 500, 'Failed to create user', { err, external_id })
  }

  set.status = 201
  return { id: user.id.toString(), external_id: user.external_id }
}
