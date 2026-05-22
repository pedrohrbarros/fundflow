import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { clerkRegisterWebhook } from './clerk/register'
import { clerkDeleteWebhook } from './clerk/delete'
import { WEBHOOK_RATE_LIMIT } from '../../../constants/api/rules/webhooks'
import { CLERK_ALLOWED_IPS_FLAT } from '../../../constants/webhooks/rules/clerk'
import { isAllowedIP } from '../../../helpers/network/cidr'
import { handleError } from '../../../middleware/error'
import { ClerkUserCreatedWebhookBody } from '../../../types/webhooks/clerk'

const clerkIpGuard = ({
  request,
  set,
  server,
}: {
  request: Request
  set: { status?: number | string }
  server: { requestIP: (req: Request) => { address: string } | null } | null
}) => {
  const client_ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    server?.requestIP(request)?.address ??
    ''
  if (!isAllowedIP(client_ip, CLERK_ALLOWED_IPS_FLAT)) {
    return handleError(set, 403, 'IP not allowed', { client_ip })
  }
}

const svixHeaderDetail = [
  {
    name: 'svix-id',
    in: 'header',
    required: true,
    schema: { type: 'string' as const },
    description: 'Unique message identifier for the webhook payload',
  },
  {
    name: 'svix-timestamp',
    in: 'header',
    required: true,
    schema: { type: 'string' as const },
    description: 'Unix timestamp (seconds) when the webhook was sent',
  },
  {
    name: 'svix-signature',
    in: 'header',
    required: true,
    schema: { type: 'string' as const },
    description: 'Space-delimited list of signatures (e.g. v1,<base64>)',
  },
]

export const webhooks = new Elysia()
  .use(rateLimit({ ...WEBHOOK_RATE_LIMIT, scoping: 'scoped' }))
  .onParse(({ request, contentType }) => {
    if (contentType.includes('application/json')) return request.text()
  })
  .post('/webhooks/clerk/register', clerkRegisterWebhook, {
    beforeHandle: clerkIpGuard as never,
    detail: {
      security: [{ bearerAuth: [] }],
      parameters: svixHeaderDetail,
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
  .post('/webhooks/clerk/delete', clerkDeleteWebhook, {
    beforeHandle: clerkIpGuard as never,
    detail: {
      security: [{ bearerAuth: [] }],
      parameters: svixHeaderDetail,
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
