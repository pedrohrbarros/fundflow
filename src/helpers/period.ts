export type Granularity = 'daily' | 'monthly' | 'annually'
export type PeriodInput = { granularity: Granularity; date: string } // date: YYYY-MM-DD
type YMD = { year: number; month: number; day: number } // month 1-12

const GRANULARITIES: Granularity[] = ['daily', 'monthly', 'annually']

// Last day of a 1-indexed month, UTC (Date.UTC month arg is 0-indexed, day 0 = prev month's last day).
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parseYMD(date: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export function isValidYMD(date: string): boolean {
  return parseYMD(date) !== null
}

function recordYMD(date: string | Date): YMD {
  if (typeof date === 'string') {
    const ymd = parseYMD(date.slice(0, 10))
    if (!ymd) throw new Error(`Invalid record date: ${date}`)
    return ymd
  }
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function cmp(a: YMD, b: YMD): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function resolvePeriod(body: {
  granularity?: unknown
  date?: unknown
}): { ok: true; period: PeriodInput } | { ok: false; error: string } {
  const granularity = body.granularity ?? 'monthly'
  const date = body.date ?? todayUTC()
  if (typeof granularity !== 'string' || !GRANULARITIES.includes(granularity as Granularity))
    return { ok: false, error: `granularity must be one of: ${GRANULARITIES.join(', ')}` }
  if (typeof date !== 'string' || !isValidYMD(date))
    return { ok: false, error: 'date must be a valid YYYY-MM-DD' }
  return { ok: true, period: { granularity: granularity as Granularity, date } }
}

export function periodRange(p: PeriodInput): { start: YMD; end: YMD } {
  const ref = parseYMD(p.date)!
  switch (p.granularity) {
    case 'daily':
      return { start: { ...ref }, end: { ...ref } }
    case 'monthly':
      return {
        start: { year: ref.year, month: ref.month, day: 1 },
        end: { year: ref.year, month: ref.month, day: daysInMonth(ref.year, ref.month) },
      }
    case 'annually':
      return {
        start: { year: ref.year, month: 1, day: 1 },
        end: { year: ref.year, month: 12, day: 31 },
      }
  }
}

export function periodContribution(
  record: { date: string | Date; is_recurring: boolean; amount: number },
  p: PeriodInput
): { applies: boolean; period_amount: number } {
  const rec = recordYMD(record.date)
  const ref = parseYMD(p.date)!

  if (!record.is_recurring) {
    const { start, end } = periodRange(p)
    const applies = cmp(start, rec) <= 0 && cmp(rec, end) <= 0
    return { applies, period_amount: applies ? record.amount : 0 }
  }

  switch (p.granularity) {
    case 'monthly': {
      const applies = ref.year > rec.year || (ref.year === rec.year && ref.month >= rec.month)
      return { applies, period_amount: applies ? record.amount : 0 }
    }
    case 'annually': {
      const activeMonths = ref.year < rec.year ? 0 : ref.year > rec.year ? 12 : 12 - rec.month + 1
      return { applies: activeMonths > 0, period_amount: record.amount * activeMonths }
    }
    case 'daily': {
      const occurrenceDay = Math.min(rec.day, daysInMonth(ref.year, ref.month))
      const applies = cmp(ref, rec) >= 0 && ref.day === occurrenceDay
      return { applies, period_amount: applies ? record.amount : 0 }
    }
  }
}
