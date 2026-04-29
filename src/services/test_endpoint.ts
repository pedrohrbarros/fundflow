import { logger } from '../config/logging'
import type { ServiceResult } from './types'

export const TestEndpointService = {
  logUserId(user_id: string): ServiceResult<{ user_id: string }> {
    logger.info({ user_id }, 'Test endpoint called by user')
    return { ok: true, data: { user_id } }
  },
}
