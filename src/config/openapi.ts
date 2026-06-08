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
        apiKey: {
          type: 'apiKey' as const,
          in: 'header' as const,
          name: 'X-Api-Key',
          description: 'API key for Swagger documentation access',
        },
      },
    },
    security: [{ apiKey: [] }],
    tags: [
      { name: 'Categories' },
      { name: 'Sources of Income' },
      { name: 'Payment Methods' },
      { name: 'Expenses' },
      { name: 'Users' },
    ],
  },
}
