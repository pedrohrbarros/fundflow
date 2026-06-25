export type SortDirection = 'asc' | 'desc'
export type SortSpec = { field: string; direction: SortDirection }
export type SortableValue = string | number | boolean

type SortOk = { ok: true; sort?: SortSpec }
type SortError = { ok: false; error: string }

export function parseSort(input: unknown, allowed: readonly string[]): SortOk | SortError {
  if (input === undefined || input === null) return { ok: true, sort: undefined }
  if (typeof input !== 'object' || Array.isArray(input))
    return { ok: false, error: 'sort must be an object { field, direction }' }
  const { field, direction } = input as { field?: unknown; direction?: unknown }
  if (typeof field !== 'string' || !allowed.includes(field))
    return { ok: false, error: `sort.field must be one of: ${allowed.join(', ')}` }
  const dir = direction ?? 'asc'
  if (dir !== 'asc' && dir !== 'desc')
    return { ok: false, error: "sort.direction must be 'asc' or 'desc'" }
  return { ok: true, sort: { field, direction: dir } }
}

export function compareSortable(a: SortableValue, b: SortableValue): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  return a < b ? -1 : a > b ? 1 : 0
}

export function applyInAppSort<T>(
  items: T[],
  getValue: (item: T) => SortableValue,
  direction: SortDirection
): void {
  const mul = direction === 'asc' ? 1 : -1
  items.sort((a, b) => mul * compareSortable(getValue(a), getValue(b)))
}
