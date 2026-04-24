import { Elysia } from 'elysia'
import { clerkUserCreatedListenerWebhook } from './webhooks/clerk/user-created'

export const webhooks = new Elysia().post(
  '/webhooks/clerk/user-created/listener',
  clerkUserCreatedListenerWebhook
)
