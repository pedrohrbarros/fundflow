import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { rateLimit } from 'elysia-rate-limit'
import { swagger } from '@elysiajs/swagger'
import { open_api_config } from './config/openapi'
import { withBearerAuth, withUserAuth } from './middleware/auth'
import { webhooks } from './routes/v1/webhooks'
import { categories } from './routes/v1/categories'
import { sources_of_income } from './routes/v1/sources_of_income'
import { payment_methods } from './routes/v1/payment_methods'
import { expenses } from './routes/v1/expenses'
import { users } from './routes/v1/users'
import { endpoint_logger, logger } from './config/logging'

const SWAGGER_UI_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Fundflow API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/openapi/json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        persistAuthorization: true,
        requestInterceptor: function(req) {
          req.headers['X-Docs-Mode'] = 'true'
          return req
        },
      })
    </script>
  </body>
</html>`

function parse_allowed_origins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS
  if (!raw) return ['http://localhost:3000']
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
      throw new TypeError('Expected a JSON array of strings')
    }
    return parsed
  } catch (error) {
    throw new Error(`Invalid ALLOWED_ORIGINS: ${error}`)
  }
}

const allowed_origins = parse_allowed_origins()

export const app = new Elysia()
  .use(
    cors({
      origin: allowed_origins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Api-Key', 'X-Docs-Mode'],
      credentials: true,
    })
  )
  .use(
    rateLimit({
      duration: 60_000,
      max: 100,
      generator: (request, server) =>
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        server?.requestIP(request)?.address ??
        'unknown',
    })
  )
  .derive(() => ({ requestStart: Date.now() }))
  .onRequest(() => {
    endpoint_logger.info('Incoming request')
  })
  .onAfterResponse(({ set, requestStart }) => {
    endpoint_logger.info(
      { status: set.status, duration: `${Date.now() - requestStart}ms` },
      'Request completed'
    )
  })
  .onError(({ error }) => {
    endpoint_logger.error({ error: String(error) }, 'Request error')
  })
  .use(swagger(open_api_config))
  .group('/api/v1', (app) => withBearerAuth(app).use(webhooks))
  .group('/api/v1', (app) =>
    withUserAuth(app)
      .use(categories)
      .use(sources_of_income)
      .use(payment_methods)
      .use(expenses)
      .use(users)
  )
  .get('/', () => 'Fundflow API')
  .get('/docs', () => new Response(SWAGGER_UI_HTML, { headers: { 'Content-Type': 'text/html' } }))

if (import.meta.main) {
  app.listen(Number(process.env.PORT ?? 8000))
  logger.info(`Fundflow is running at ${app.server?.hostname}:${app.server?.port}`)
}
