import { Elysia } from 'elysia'
import { logger } from '../config/logging'
import { verifyAccessToken } from '../helpers/auth/tokens'
import { DocsService } from '../services/docs'

export const withUserAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  app
    .derive(async ({ request }) => {
      if (request.headers.get('X-Docs-Mode') === 'true') {
        const expected_api_key = process.env.API_TOKEN
        if (!expected_api_key) return { user_external_id: null }
        const api_key = request.headers.get('X-Api-Key')
        if (api_key?.trim() !== expected_api_key.trim()) return { user_external_id: null }
        const result = await DocsService.findOrCreateMonthlyTestUser()
        return { user_external_id: result.ok ? result.data.external_id : null }
      }

      const auth = request.headers.get('Authorization')
      if (!auth?.startsWith('Bearer ')) return { user_external_id: null }
      const claims = await verifyAccessToken(auth.slice(7))
      return { user_external_id: claims?.external_id ?? null }
    })
    .onBeforeHandle(({ request, user_external_id, set }) => {
      if (!user_external_id) {
        const is_docs_mode = request.headers.get('X-Docs-Mode') === 'true'
        logger.warn(
          { reason: is_docs_mode ? 'invalid_api_key' : 'invalid_jwt' },
          'Unauthorized request rejected'
        )
        set.status = 401
        return { error: 'Unauthorized' }
      }
    })
