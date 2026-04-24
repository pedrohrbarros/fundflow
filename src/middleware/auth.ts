import { Elysia } from 'elysia'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withBearerAuth = (app: Elysia<any, any, any, any, any, any, any>) =>
  app.onBeforeHandle(({ request, set }) => {
    const authorizationHeader = request.headers.get('authorization')
    if (!authorizationHeader || authorizationHeader !== `Bearer ${process.env.API_TOKEN}`) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
  })
