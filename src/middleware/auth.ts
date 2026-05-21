import { Elysia } from 'elysia'
import { jwtVerify } from 'jose'
import { getClerkPublicKey } from '../config/clerk'
import { logger } from '../config/logging'

export const withBearerAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  app.onBeforeHandle(({ request, set }) => {
    const authorization_header = request.headers.get('Authorization')
    if (!authorization_header || authorization_header !== `Bearer ${process.env.API_TOKEN}`) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })

const deriveClerkUserId = (app: Elysia<any, any, any, any, any, any, any>) =>
  app.derive(async ({ request }) => {
    try {
      const authorization_header = request.headers.get('Authorization')
      if (!authorization_header?.startsWith('Bearer ')) return { clerk_user_id: null }

      const token = authorization_header.slice(7)
      const public_key = await getClerkPublicKey()
      const { payload } = await jwtVerify(token, public_key, { algorithms: ['RS256'] })

      const authorized_party = process.env.CLERK_AUTHORIZED_PARTY
      if (authorized_party && payload.azp !== authorized_party) return { clerk_user_id: null }

      const clerk_user_id = typeof payload.sub === 'string' ? payload.sub : null
      return { clerk_user_id }
    } catch (err) {
      logger.warn({ err }, 'JWT verification failed')
      return { clerk_user_id: null }
    }
  })

export const withClerkAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  deriveClerkUserId(app).onBeforeHandle(({ clerk_user_id, set }) => {
    if (!clerk_user_id) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })

export const withClerkAndBearerAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  deriveClerkUserId(app).onBeforeHandle(({ request, clerk_user_id, set }) => {
    const api_key = request.headers.get('X-Api-Key')
    if (!clerk_user_id || api_key !== process.env.API_TOKEN) {
      logger.warn(
        { reason: !clerk_user_id ? 'invalid_jwt' : 'invalid_api_key' },
        'Unauthorized request rejected'
      )
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })
