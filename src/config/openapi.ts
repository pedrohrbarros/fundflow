export const open_api_config = {
  path: '/openapi' as const,
  documentation: {
    info: {
      title: 'Fundflow',
      description: 'Fundflow API documentation',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http' as const,
          scheme: 'bearer',
          description: 'Bearer token authentication (JWT or similar)',
        },
      },
    },
  },
}
