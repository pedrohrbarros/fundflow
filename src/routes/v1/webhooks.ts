import { Elysia } from 'elysia'
import { clerkRegisterWebhook } from './webhooks/clerk/register'

export const webhooks = new Elysia()
  .onParse(({ request, contentType }) => {
    if (contentType.includes('application/json')) return request.text()
  })
  .post('/webhooks/clerk/register', clerkRegisterWebhook)
