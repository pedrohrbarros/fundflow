import { Elysia } from 'elysia'

export const withBearerAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  app.onBeforeHandle(({ request, set }) => {
    const authorization_header = request.headers.get('Authorization')
    if (!authorization_header || authorization_header !== `Bearer ${process.env.API_TOKEN}`) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })
