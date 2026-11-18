import type {
  ChartPoint,
  DailyPoint,
  Horizon,
  ProductMeta,
  SaleRow,
  SkuForecast,
  StoreSummary,
} from '../types'
import { displayDate, enumerateDays, nextDays, weekdayIndex } from './dates'

const HORIZONS: Horizon[] = [7, 15, 30]

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdev(values: number[]): number {
  if (values.length < 2) return Math.sqrt(Math.max(mean(values), 0.25))
  const m = mean(values)
  const v = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(Math.max(v, 0.05))
}

function classifyDemand(adi: number, cv2: number): SkuForecast['demandClass'] {
  if (adi < 1.32 && cv2 < 0.49) return 'smooth'
  if (adi < 1.32) return 'erratic'
  if (cv2 < 0.49) return 'intermittent'
  return 'lumpy'
}

function tsb(series: number[], alpha = 0.2, beta = 0.08) {
  let size = Math.max(mean(series.filter((x) => x > 0)), 0.15)
  let prob = Math.min(0.95, Math.max(0.05, series.filter((x) => x > 0).length / Math.max(series.length, 1)))
  const fitted: number[] = []
  for (const y of series) {
    fitted.push(size * prob)
    if (y > 0) {
      size = size + alpha * (y - size)
      prob = prob + beta * (1 - prob)
    } else {
      prob = prob + beta * (0 - prob)
    }
  }
  return { fitted, forecast: size * prob, size, prob }
}

function holt(series: number[], alpha = 0.35, beta = 0.12) {
  let level = series[0] ?? 0
  let trend = (series[series.length - 1] ?? 0) - (series[0] ?? 0)
  trend /= Math.max(series.length - 1, 1)
  const fitted: number[] = []
  for (const y of series) {
    fitted.push(Math.max(0, level + trend))
    const nextLevel = alpha * y + (1 - alpha) * (level + trend)
    const nextTrend = beta * (nextLevel - level) + (1 - beta) * trend
    level = nextLevel
    trend = nextTrend
  }
  return { fitted, level, trend, forecast: Math.max(0, level + trend) }
}

function weekdayFactors(points: DailyPoint[]): number[] {
  const buckets = Array.from({ length: 7 }, () => [] as number[])
  for (const point of points) {
    buckets[weekdayIndex(point.date)].push(point.qty)
  }
  const overall = mean(points.map((p) => p.qty)) || 1
  return buckets.map((vals) => {
    if (!vals.length) return 1
    return Math.min(1.6, Math.max(0.55, mean(vals) / overall))
  })
}

function residuals(actual: number[], fitted: number[]): number[] {
  return actual.map((y, i) => y - (fitted[i] ?? 0))
}

function mape(actual: number[], fitted: number[]): number | null {
  const pairs = actual
    .map((y, i) => ({ y, f: fitted[i] ?? 0 }))
    .filter((p) => p.y > 0)
  if (!pairs.length) return null
  const err = mean(pairs.map((p) => Math.abs(p.y - p.f) / p.y))
  return Math.min(err * 100, 99)
}

function latestMeta(rows: SaleRow[]): ProductMeta {
  const last = rows[rows.length - 1]
  return {
    icode: last.icode,
    ean: last.ean,
    article: last.article,
    division: last.division,
    section: last.section,
    department: last.department,
    itemDesc: last.itemDesc,
    brand: last.brand,
    rsp: last.rsp,
  }
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export function calendarFromRows(rows: SaleRow[]): string[] {
  const dates = uniqueSorted(rows.map((r) => r.billDate))
  if (!dates.length) return []
  return enumerateDays(dates[0], dates[dates.length - 1])
}

export function storeSummaries(rows: SaleRow[]): StoreSummary[] {
  const map = new Map<string, StoreSummary>()
  for (const row of rows) {
    const current = map.get(row.storeName) ?? {
      storeName: row.storeName,
      bills: 0,
      units: 0,
      revenue: 0,
      skuCount: 0,
    }
    current.units += row.quantity
    current.revenue += row.netAmount
    map.set(row.storeName, current)
  }
  for (const summary of map.values()) {
    const storeRows = rows.filter((r) => r.storeName === summary.storeName)
    summary.bills = new Set(storeRows.map((r) => r.billNo)).size
    summary.skuCount = new Set(storeRows.map((r) => r.icode)).size
  }
  return [...map.values()]
}

function buildHistory(rows: SaleRow[], calendar: string[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>()
  for (const date of calendar) {
    byDate.set(date, { date, qty: 0, net: 0, promoShare: 0 })
  }
  const promoDays = new Map<string, { promo: number; n: number }>()
  for (const row of rows) {
    const point = byDate.get(row.billDate)
    if (!point) continue
    point.qty += row.quantity
    point.net += row.netAmount
    const promo = promoDays.get(row.billDate) ?? { promo: 0, n: 0 }
    promo.n += 1
    if (row.promoCode) promo.promo += 1
    promoDays.set(row.billDate, promo)
  }
  for (const [date, stats] of promoDays) {
    const point = byDate.get(date)
    if (point) point.promoShare = stats.promo / stats.n
  }
  return [...byDate.values()]
}

function forecastSeries(
  history: DailyPoint[],
  deptMean: number,
  storeMean: number,
): Pick<
  SkuForecast,
  | 'model'
  | 'adi'
  | 'cv2'
  | 'demandClass'
  | 'dailyMean'
  | 'dailyForecast'
  | 'dailyLo'
  | 'dailyHi'
  | 'inSampleMape'
> {
  const qty = history.map((p) => p.qty)
  const nonzero = qty.filter((x) => x > 0)
  const adi = qty.length / Math.max(nonzero.length, 0.5)
  const cv2 = nonzero.length > 1 ? (stdev(nonzero) / Math.max(mean(nonzero), 0.01)) ** 2 : 1
  const demandClass = classifyDemand(adi, cv2)
  const useTsb = adi >= 1.32 || nonzero.length <= 3
  const seasonal = weekdayFactors(history)

  const base = useTsb ? tsb(qty) : holt(qty)
  const fitted = base.fitted
  const sigma = Math.max(stdev(residuals(qty, fitted)), 0.35)
  const nDemand = nonzero.length
  const shrink = nDemand / (nDemand + 2.5)
  const prior = 0.65 * deptMean + 0.35 * storeMean
  const level = shrink * base.forecast + (1 - shrink) * prior
  const lastIso = history[history.length - 1]?.date
  const futureDates = lastIso ? nextDays(lastIso, 30) : []

  const dailyForecast = futureDates.map((date, h) => {
    const seas = seasonal[weekdayIndex(date)] ?? 1
    const phi = 0.88
    const dampedTrend = useTsb ? 1 : 1 + (1 - phi ** (h + 1)) / (1 - phi) * 0.04
    return Math.max(0, level * seas * dampedTrend)
  })

  const dailyLo = dailyForecast.map((y, h) => Math.max(0, y - 1.28 * sigma * Math.sqrt((h + 1) / 2)))
  const dailyHi = dailyForecast.map((y, h) => y + 1.28 * sigma * Math.sqrt((h + 1) / 2))

  return {
    model: useTsb ? 'TSB' : 'Holt',
    adi,
    cv2,
    demandClass,
    dailyMean: mean(qty),
    dailyForecast,
    dailyLo,
    dailyHi,
    inSampleMape: mape(qty, fitted),
  }
}

export function forecastStoreCatalog(rows: SaleRow[], storeName: string): SkuForecast[] {
  const calendar = calendarFromRows(rows)
  const storeRows = rows.filter((r) => r.storeName === storeName)
  const storeHistory = buildHistory(storeRows, calendar)
  const storeMean = mean(storeHistory.map((p) => p.qty)) / Math.max(new Set(storeRows.map((r) => r.icode)).size, 1)

  const deptMeans = new Map<string, number>()
  const depts = uniqueSorted(storeRows.map((r) => r.department || r.section))
  for (const dept of depts) {
    const deptRows = storeRows.filter((r) => (r.department || r.section) === dept)
    const skuN = Math.max(new Set(deptRows.map((r) => r.icode)).size, 1)
    deptMeans.set(dept, mean(buildHistory(deptRows, calendar).map((p) => p.qty)) / skuN)
  }

  const icodes = uniqueSorted(storeRows.map((r) => r.icode))
  return icodes.map((icode) => {
    const skuRows = storeRows.filter((r) => r.icode === icode)
    const history = buildHistory(skuRows, calendar)
    const product = latestMeta(skuRows)
    const deptMean = deptMeans.get(product.department || product.section) ?? storeMean
    const core = forecastSeries(history, deptMean, storeMean)
    const units = skuRows.reduce((a, r) => a + r.quantity, 0)
    const net = skuRows.reduce((a, r) => a + r.netAmount, 0)
    const avgRsp = mean(skuRows.map((r) => r.rsp).filter(Boolean)) || product.rsp
    const avgNetPerUnit = units > 0 ? net / units : avgRsp
    const stockInHand = skuRows[skuRows.length - 1]?.stockInHand ?? 0
    const promoRate = skuRows.filter((r) => r.promoCode).length / Math.max(skuRows.length, 1)

    const sumRange = (arr: number[], n: Horizon) => arr.slice(0, n).reduce((a, b) => a + b, 0)
    const horizonQty = { 7: sumRange(core.dailyForecast, 7), 15: sumRange(core.dailyForecast, 15), 30: sumRange(core.dailyForecast, 30) }
    const horizonLo = { 7: sumRange(core.dailyLo, 7), 15: sumRange(core.dailyLo, 15), 30: sumRange(core.dailyLo, 30) }
    const horizonHi = { 7: sumRange(core.dailyHi, 7), 15: sumRange(core.dailyHi, 15), 30: sumRange(core.dailyHi, 30) }
    const horizonRevenue = {
      7: horizonQty[7] * avgNetPerUnit,
      15: horizonQty[15] * avgNetPerUnit,
      30: horizonQty[30] * avgNetPerUnit,
    }

    const stockoutDay: SkuForecast['stockoutDay'] = { 7: null, 15: null, 30: null }
    for (const h of HORIZONS) {
      let running = 0
      let day: number | null = null
      for (let i = 0; i < h; i += 1) {
        running += core.dailyForecast[i] ?? 0
        if (running > stockInHand) {
          day = i + 1
          break
        }
      }
      stockoutDay[h] = day
    }

    return {
      storeName,
      product,
      stockInHand,
      avgRsp,
      avgNetPerUnit,
      history,
      ...core,
      horizonQty,
      horizonLo,
      horizonHi,
      horizonRevenue,
      stockoutDay,
      promoRate,
    }
  }).sort((a, b) => b.horizonQty[7] - a.horizonQty[7])
}

export function toChartPoints(sku: SkuForecast, horizon: Horizon): ChartPoint[] {
  const history = sku.history.map((point, index, all) => {
    const isLast = index === all.length - 1
    return {
      date: point.date,
      label: displayDate(point.date),
      actual: point.qty,
      fitted: sku.dailyMean,
      forecast: isLast ? point.qty : null,
      lo: isLast ? point.qty : null,
      hi: isLast ? point.qty : null,
      kind: 'history' as const,
    }
  })
  const last = sku.history[sku.history.length - 1]?.date
  const future = last ? nextDays(last, horizon) : []
  const forecast = future.map((date, i) => ({
    date,
    label: displayDate(date),
    actual: null,
    fitted: null,
    forecast: sku.dailyForecast[i] ?? 0,
    lo: sku.dailyLo[i] ?? 0,
    hi: sku.dailyHi[i] ?? 0,
    kind: 'forecast' as const,
  }))
  return [...history, ...forecast]
}

export function inr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function compact(value: number, digits = 1): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
}
