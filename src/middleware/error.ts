import { endpoint_logger } from '../config/logging'

export function handleError(
  set: { status?: number | string },
  status: number,
  message: string,
  meta?: Record<string, unknown>
): { error: string } {
  endpoint_logger.error({ ...meta }, message)
  set.status = status
  return { error: message }
}
