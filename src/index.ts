import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { openApiConfig } from './config/openapi'

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
  .use(swagger(openApiConfig))
  .get('/', () => 'Hello Elysia')
  .get('/docs', () => new Response(REDOC_HTML, { headers: { 'Content-Type': 'text/html' } }))

if (import.meta.main) {
  app.listen(3000)
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
}
