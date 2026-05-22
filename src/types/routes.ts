// Elysia infers handler context via its internal generic chain. Handlers that use
// derived properties (e.g. clerk_user_id) don't match the base Context type at the
// call site, requiring a cast. This named type consolidates all such casts in one place.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (context: any) => any
