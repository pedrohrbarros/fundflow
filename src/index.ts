import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { rateLimit } from 'elysia-rate-limit'
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
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Api-Key'],
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
    withClerkAndBearerAuth(app)
      .use(categories)
      .use(sources_of_income)
      .use(payment_methods)
      .use(expenses)
  )
  .get('/', () => 'Fundflow API')
  .get('/docs', () => new Response(REDOC_HTML, { headers: { 'Content-Type': 'text/html' } }))

if (import.meta.main) {
  app.listen(Number(process.env.PORT ?? 8000))
  logger.info(`Fundflow is running at ${app.server?.hostname}:${app.server?.port}`)
}
