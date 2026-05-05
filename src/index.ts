import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { open_api_config } from './config/openapi'
import { withBearerAuth, withClerkAndBearerAuth } from './middleware/auth'
import { webhooks } from './routes/v1/webhooks'
import { categories } from './routes/v1/categories'
import { sources_of_income } from './routes/v1/sources_of_income'
import { payment_methods } from './routes/v1/payment_methods'
import { expenses } from './routes/v1/expenses'
import { endpoint_logger, logger } from './config/logging'

const REDOC_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Fundflow API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url="/openapi/json"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
  </body>
</html>`

export const app = new Elysia()
  .derive(() => ({ requestStart: Date.now() }))
  .onRequest(({ request }) => {
    endpoint_logger.info({ method: request.method, url: request.url }, 'Incoming request')
  })
  .onAfterResponse(({ request, set, requestStart }) => {
    endpoint_logger.info(
      {
        method: request.method,
        url: request.url,
        status: set.status,
        duration: Date.now() - requestStart,
      },
      'Request completed'
    )
  })
  .onError(({ error, request, set }) => {
    endpoint_logger.error(
      { method: request.method, url: request.url, status: set.status, error: String(error) },
      'Request error'
    )
  })
  .use(swagger(open_api_config))
  .group('/v1', (app) => withBearerAuth(app).use(webhooks))
  .group('/v1', (app) =>
    withClerkAndBearerAuth(app)
      .use(categories)
      .use(sources_of_income)
      .use(payment_methods)
      .use(expenses)
  )
  .get('/', () => 'Fundflow API')
  .get('/docs', () => new Response(REDOC_HTML, { headers: { 'Content-Type': 'text/html' } }))

if (import.meta.main) {
  app.listen(3000)
  logger.info(`Fundflow is running at ${app.server?.hostname}:${app.server?.port}`)
}
