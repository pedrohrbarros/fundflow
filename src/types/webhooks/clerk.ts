import { t } from 'elysia'
import type { Static } from '@sinclair/typebox'

const ClerkWebhookData = t.Object({
  backup_code_enabled: t.Boolean(),
  banned: t.Boolean(),
  create_organization_enabled: t.Boolean(),
  create_organizations_limit: t.Union([t.Number(), t.Null()]),
  created_at: t.Number(),
  delete_self_enabled: t.Boolean(),
  email_addresses: t.Array(t.Unknown()),
  enterprise_accounts: t.Array(t.Unknown()),
  external_accounts: t.Array(t.Unknown()),
  external_id: t.Union([t.String(), t.Null()]),
  first_name: t.Union([t.String(), t.Null()]),
  has_image: t.Boolean(),
  id: t.String(),
  image_url: t.String(),
  last_active_at: t.Union([t.Number(), t.Null()]),
  last_name: t.Union([t.String(), t.Null()]),
  last_sign_in_at: t.Union([t.Number(), t.Null()]),
  legal_accepted_at: t.Union([t.Number(), t.Null()]),
  locked: t.Boolean(),
  lockout_expires_in_seconds: t.Union([t.Number(), t.Null()]),
  mfa_disabled_at: t.Union([t.Number(), t.Null()]),
  mfa_enabled_at: t.Union([t.Number(), t.Null()]),
  object: t.Literal('user'),
  passkeys: t.Array(t.Unknown()),
  password_enabled: t.Boolean(),
  phone_numbers: t.Array(t.Unknown()),
  primary_email_address_id: t.Union([t.String(), t.Null()]),
  primary_phone_number_id: t.Union([t.String(), t.Null()]),
  primary_web3_wallet_id: t.Union([t.String(), t.Null()]),
  private_metadata: t.Union([t.Record(t.String(), t.Unknown()), t.Null()]),
  profile_image_url: t.String(),
  public_metadata: t.Record(t.String(), t.Unknown()),
  saml_accounts: t.Array(t.Unknown()),
  totp_enabled: t.Boolean(),
  two_factor_enabled: t.Boolean(),
  unsafe_metadata: t.Record(t.String(), t.Unknown()),
  updated_at: t.Number(),
  username: t.Union([t.String(), t.Null()]),
  verification_attempts_remaining: t.Union([t.Number(), t.Null()]),
  web3_wallets: t.Array(t.Unknown()),
})

export const ClerkUserCreatedWebhookBody = t.Object({
  data: ClerkWebhookData,
  event_attributes: t.Object({
    http_request: t.Object({
      client_ip: t.String(),
      user_agent: t.String(),
    }),
  }),
  instance_id: t.String(),
  object: t.Literal('event'),
  timestamp: t.Number(),
  type: t.Literal('user.created'),
})

export type ClerkUserCreatedEvent = Static<typeof ClerkUserCreatedWebhookBody>
