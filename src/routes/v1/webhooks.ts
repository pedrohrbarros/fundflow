import { Elysia } from 'elysia'
import { clerkRegisterWebhook } from './webhooks/clerk/register'

export const webhooks = new Elysia()
  .onParse(({ request }) => request.text())
  .post('/webhooks/clerk/register', clerkRegisterWebhook)
