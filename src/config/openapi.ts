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
      { name: 'Categories', description: 'Source of income category management' },
      { name: 'Sources of Income', description: 'Income source management' },
      { name: 'Payment Methods', description: 'Payment method management' },
      { name: 'Expenses', description: 'Expense tracking and management' },
      { name: 'Users', description: 'User profile management' },
    ],
  },
}
