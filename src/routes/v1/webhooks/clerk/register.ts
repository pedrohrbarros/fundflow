// src/routes/v1/webhooks/clerk/register.ts
import type { Context } from 'elysia'
import { verifySvixSignature } from '../../../../helpers/webhooks/auth/svix'
import { handleError } from '../../../../middleware/error'
import { ClerkWebhookService } from '../../../../services/webhooks/clerk'
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
    process.env.CLERK_REGISTER_USER_WEBHOOK_SIGNING_SECRET ?? ''
  )

  if (!verification.success)
    return handleError(set, 400, 'Webhook verification failed', { reason: verification.reason })

  let event: ClerkUserCreatedEvent
  try {
    event = JSON.parse(raw_body) as ClerkUserCreatedEvent
  } catch (error) {
    return handleError(set, 400, 'Invalid JSON body', { error })
  }

  if (event.type !== 'user.created') return { message: 'Event ignored' }

  const external_id = event.data.id
  if (!external_id)
    return handleError(set, 400, 'Missing user id in webhook payload', { event_type: event.type })

  const result = await ClerkWebhookService.registerUser(external_id)
  if (!result.ok) return handleError(set, result.status, result.message, result.meta)

  set.status = 201
  return result.data
}
