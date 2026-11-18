import { addDays, format, parse, isValid } from 'date-fns'

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000
  const date = new Date(utc)
  return isValid(date) ? date : null
}

export function parseBillDate(value: unknown): Date | null {
  if (value instanceof Date && isValid(value)) return value
  if (typeof value === 'number') {
    const fromSerial = excelSerialToDate(value)
    if (fromSerial) return fromSerial
    return null
  }
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const fromSerial = excelSerialToDate(Number(raw))
    if (fromSerial) return fromSerial
  }
  const patterns = [
    'dd-MM-yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'd-M-yyyy',
    'd/M/yyyy',
    'dd-MM-yy',
    'dd/MM/yy',
    'MMM d, yyyy',
    'd MMM yyyy',
    'yyyy/MM/dd',
  ]
  for (const pattern of patterns) {
    const parsed = parse(raw, pattern, new Date())
    if (isValid(parsed)) return parsed
  }
  const fallback = new Date(raw)
  return isValid(fallback) ? fallback : null
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function displayDate(iso: string): string {
  const parsed = parse(iso, 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? format(parsed, 'dd MMM') : iso
}

export function weekdayIndex(iso: string): number {
  const parsed = parse(iso, 'yyyy-MM-dd', new Date())
  return parsed.getDay()
}

export function enumerateDays(startIso: string, endIso: string): string[] {
  const start = parse(startIso, 'yyyy-MM-dd', new Date())
  const end = parse(endIso, 'yyyy-MM-dd', new Date())
  const days: string[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(toIsoDate(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

export function nextDays(lastIso: string, count: number): string[] {
  const last = parse(lastIso, 'yyyy-MM-dd', new Date())
  return Array.from({ length: count }, (_, i) => toIsoDate(addDays(last, i + 1)))
}
