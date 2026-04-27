import { Elysia } from 'elysia'
import { clerkRegisterWebhook } from './webhooks/clerk/register'

export const webhooks = new Elysia().post('/webhooks/clerk/register', clerkRegisterWebhook)
