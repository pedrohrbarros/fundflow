// src/services/types.ts
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; meta?: Record<string, unknown> }
