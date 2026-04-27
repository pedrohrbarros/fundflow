import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { clerkRegisterWebhook } from './webhooks/clerk/register'
import { WEBHOOK_RATE_LIMIT } from '../../constants/api/rules/webhooks'
import { CLERK_ALLOWED_IPS_FLAT } from '../../constants/webhooks/rules/clerk'
import { isAllowedIP } from '../../helpers/network/cidr'
import { handleError } from '../../middleware/error'
import { ClerkUserCreatedWebhookBody } from '../../types/webhooks/clerk'

export const webhooks = new Elysia()
  .use(rateLimit({ ...WEBHOOK_RATE_LIMIT, scoping: 'scoped' }))
  .onParse(({ request, contentType }) => {
    if (contentType.includes('application/json')) return request.text()
  })
  .post('/webhooks/clerk/register', clerkRegisterWebhook, {
    beforeHandle: ({ request, set, server }) => {
      const client_ip =
        server?.requestIP(request)?.address ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        ''
      if (!isAllowedIP(client_ip, CLERK_ALLOWED_IPS_FLAT)) {
        return handleError(set, 403, 'IP not allowed', { client_ip })
      }
    },
    detail: {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ClerkUserCreatedWebhookBody as unknown as Record<string, unknown>,
          },
        },
      },
    },
  })
