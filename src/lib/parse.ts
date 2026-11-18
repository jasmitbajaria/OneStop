import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { SaleRow } from '../types'
import { parseBillDate, toIsoDate } from './dates'

const ALIASES: Record<keyof SaleRow, string[]> = {
  storeName: ['storename', 'store'],
  billDate: ['billdate', 'billda', 'date'],
  customerName: ['customername', 'customer'],
  salesPerson: ['salespersonname', 'salesperson', 'sales'],
  billNo: ['billno', 'billnumber', 'invoice'],
  returnBillNo: ['returnbillno', 'returnbill'],
  quantity: ['billquantity', 'qty', 'quantity'],
  icode: ['icode', 'itemcode', 'sku'],
  ean: ['ean', 'barcode'],
  article: ['article'],
  division: ['division'],
  section: ['section'],
  department: ['department', 'dept'],
  itemDesc: ['itemdesc', 'itemdescription', 'description'],
  brand: ['brand'],
  rsp: ['rsp', 'mrp', 'price'],
  promoCode: ['promocode', 'promo'],
  taxableAmount: ['taxableamount', 'taxable'],
  cgstPct: ['cgst', 'cgstpct'],
  sgstPct: ['sgst', 'sgstpct'],
  netAmount: ['netamount', 'net'],
  stockInHand: ['stockinhand', 'stock'],
}

function canon(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function headerScore(header: string, alias: string): number {
  const h = canon(header)
  const a = canon(alias)
  if (!h || !a) return 0
  if (h === a) return 100
  if (h.startsWith(a) && a.length >= 6) return 90
  if (a.startsWith(h) && h.length >= 6) return 80
  if (h.includes(a) && a.length >= 8) return 70
  return 0
}

function buildHeaderMap(headers: string[]): Map<string, keyof SaleRow> {
  const map = new Map<string, keyof SaleRow>()
  const used = new Set<keyof SaleRow>()
  const fields = Object.keys(ALIASES) as (keyof SaleRow)[]
  for (const field of fields) {
    let best: { header: string; score: number } | null = null
    for (const header of headers) {
      if (map.has(header) || used.has(field)) continue
      const score = Math.max(...ALIASES[field].map((alias) => headerScore(header, alias)))
      if (score > (best?.score ?? 0)) best = { header, score }
    }
    if (best && best.score >= 70) {
      map.set(best.header, field)
      used.add(field)
    }
  }
  return map
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value ?? '').replace(/,/g, '').trim()
  if (!text) return 0
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

function text(value: unknown): string {
  if (value instanceof Date) return toIsoDate(value)
  return String(value ?? '').trim()
}

function recordsToRows(
  records: Record<string, unknown>[],
  headers: string[],
): SaleRow[] {
  const headerMap = buildHeaderMap(headers)
  const rows: SaleRow[] = []
  for (const record of records) {
    const picked: Partial<Record<keyof SaleRow, unknown>> = {}
    for (const [header, field] of headerMap.entries()) {
      if (picked[field] !== undefined) continue
      picked[field] = record[header]
    }
    const date = parseBillDate(picked.billDate)
    const icode = text(picked.icode)
    const storeName = text(picked.storeName)
    if (!date || !icode || !storeName) continue
    rows.push({
      storeName,
      billDate: toIsoDate(date),
      customerName: text(picked.customerName),
      salesPerson: text(picked.salesPerson),
      billNo: text(picked.billNo),
      returnBillNo: text(picked.returnBillNo),
      quantity: num(picked.quantity) || 1,
      icode,
      ean: text(picked.ean),
      article: text(picked.article),
      division: text(picked.division),
      section: text(picked.section),
      department: text(picked.department),
      itemDesc: text(picked.itemDesc),
      brand: text(picked.brand),
      rsp: num(picked.rsp),
      promoCode: text(picked.promoCode),
      taxableAmount: num(picked.taxableAmount),
      cgstPct: num(picked.cgstPct),
      sgstPct: num(picked.sgstPct),
      netAmount: num(picked.netAmount),
      stockInHand: num(picked.stockInHand),
    })
  }
  return rows
}

export function parseSalesText(raw: string): SaleRow[] {
  const trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return []
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const result = Papa.parse<Record<string, unknown>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  })
  return recordsToRows(result.data, result.meta.fields ?? [])
}

function sheetToRows(sheet: XLSX.WorkSheet): SaleRow[] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  })
  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => {
      const key = canon(String(cell ?? ''))
      return key.includes('storename') || key === 'icode' || key.includes('billquantity')
    }),
  )
  if (headerIndex < 0) return []
  const headers = (matrix[headerIndex] ?? []).map((cell, index) => {
    const label = String(cell ?? '').trim()
    return label || `COLUMN_${index + 1}`
  })
  const records = matrix.slice(headerIndex + 1).map((row) => {
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      record[header] = row[index]
    })
    return record
  })
  return recordsToRows(records, headers)
}

export async function parseSalesFile(file: File): Promise<{ rows: SaleRow[]; detail: string }> {
  const name = file.name.toLowerCase()
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')
  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue
      const rows = sheetToRows(sheet)
      if (rows.length) {
        return { rows, detail: `${file.name} · ${sheetName}` }
      }
    }
    const first = workbook.Sheets[workbook.SheetNames[0]]
    const preview = first
      ? XLSX.utils.sheet_to_json<(string | number)[]>(first, { header: 1, defval: '' })[0]
      : []
    return {
      rows: [],
      detail: `Excel headers seen: ${Array.isArray(preview) ? preview.map(String).join(', ') : 'none'}`,
    }
  }

  const text = await file.text()
  const rows = parseSalesText(text)
  if (rows.length) return { rows, detail: file.name }
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
  return {
    rows: [],
    detail: `Headers seen: ${firstLine || 'file was empty or binary'}`,
  }
}
