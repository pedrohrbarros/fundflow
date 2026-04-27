import { Webhook } from 'svix'
import { endpoint_logger } from '../../../config/logging'

export type SvixHeaders = {
  'svix-id': string | null
  'svix-timestamp': string | null
  'svix-signature': string | null
}

export type VerifyResult = { success: true } | { success: false; reason: string }

export function verifySvixSignature(
  raw_body: string,
  headers: SvixHeaders,
  signing_secret: string
): VerifyResult {
  const webhook = new Webhook(signing_secret)

  try {
    webhook.verify(raw_body, headers as Record<string, string>)
    return { success: true }
  } catch (error) {
    endpoint_logger.debug({ error }, 'Svix verification failed')
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}
