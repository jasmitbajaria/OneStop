import type { SaleRow } from '../types'
import { parseSalesText } from '../lib/parse'

const CATALOG = [
  { icode: 'OB33819', ean: '8907521545596', article: '45012411', division: 'Kitchenware', section: 'Utensils', department: 'Tope Cover', itemDesc: 'TOPE COVER 22G 11CM', brand: 'Sega', rsp: 175, promo: '', cgst: 2.5, stock: 1 },
  { icode: 'OB33524', ean: '8907521542649', article: '45014567', division: 'Kitchenware', section: 'Cookware', department: 'Tope', itemDesc: 'TOPE TRIPLY DEEP 11 16CM', brand: 'Fivanaa', rsp: 1895, promo: 'Buy1@50%', cgst: 2.5, stock: 3 },
  { icode: 'OB31612', ean: '8907521524065', article: '45018128', division: 'Kitchenware', section: 'Cookware', department: 'Langadi', itemDesc: 'LANGADI SS NO.6 26CM', brand: 'Sila SS', rsp: 2995, promo: 'Buy1@50%', cgst: 2.5, stock: 3 },
  { icode: 'OB31741', ean: '8907521525369', article: '45016659', division: 'Kitchenware', section: 'Kitchen Tools & Ut', department: 'Coffee Filter', itemDesc: 'COFFEE FILTER SS RAJ NO 1', brand: 'Raj', rsp: 495, promo: '', cgst: 2.5, stock: 1 },
  { icode: 'OB2639', ean: '8907521281838', article: '45000256', division: 'Kitchenware', section: 'Cookware', department: 'Kadhai', itemDesc: 'KADHAI 4328', brand: 'Stahl', rsp: 4080, promo: 'Buy1 or 2 20% and Buy3 Get More 30%', cgst: 2.5, stock: 0 },
  { icode: 'OB5422', ean: '8907521358967', article: '45001384', division: 'Kitchenware', section: 'Kitchen Tools & Ut', department: 'Gas Lighter', itemDesc: 'GAS LIGHTER 21 SS', brand: 'Celltone', rsp: 225, promo: '', cgst: 9, stock: 2 },
  { icode: 'OB31230', ean: '8907521520135', article: '25007399', division: 'Tableware', section: 'Serveware', department: 'Chip & Dip', itemDesc: 'PLATE SET WG-8073-U 6PC', brand: 'White Gold/Hi-Lux', rsp: 2796, promo: 'Buy1@10%', cgst: 2.5, stock: 0 },
  { icode: 'OB28070', ean: '8907521488879', article: '45018565', division: 'Kitchenware', section: 'Kitchen Tools & Ut', department: 'Kitchen Chopper', itemDesc: 'CHOPPER STEELO', brand: 'Celltone', rsp: 585, promo: '', cgst: 9, stock: 5 },
  { icode: 'OB30866', ean: '8907521516589', article: '45007981', division: 'Kitchenware', section: 'Kitchen Tools & Ut', department: 'Pakkad', itemDesc: 'PAKKAD MINI FULL SS', brand: 'Toral', rsp: 145, promo: '', cgst: 2.5, stock: 10 },
  { icode: 'OB33815', ean: '8907521545558', article: '45012488', division: 'Kitchenware', section: 'Utensils', department: 'Parat', itemDesc: 'PARAT 21G 13', brand: 'Sega', rsp: 625, promo: '', cgst: 2.5, stock: 0 },
  { icode: 'OB6775', ean: '8907521273802', article: '45001976', division: 'Kitchenware', section: 'Kitchen Tools & Ut', department: 'Tea Strainer', itemDesc: 'TEA STRAINER NO.4 SS', brand: 'Om Prabhat', rsp: 130, promo: '', cgst: 2.5, stock: 2 },
  { icode: 'OB30910', ean: '8907521517029', article: '45003576', division: 'Kitchenware', section: 'Cookware', department: 'Cooking Casserole', itemDesc: 'CASSEROLE 4120', brand: 'Stahl', rsp: 3880, promo: 'Buy1 or 2 20% and Buy3 Get More 30%', cgst: 2.5, stock: 0 },
  { icode: 'OB31923', ean: '8907521527202', article: '25004585', division: 'Tableware', section: 'Melamine Dinnerware', department: 'Soup Bowl', itemDesc: 'SOUP BOWL 2 TONE BROWN', brand: 'Servewell', rsp: 285, promo: '', cgst: 9, stock: 8 },
  { icode: 'OB31128', ean: '8907521519061', article: '25004582', division: 'Tableware', section: 'Dinnerware', department: 'Dinner Plate', itemDesc: 'DINNER PLATE 2 TONE BROWN', brand: 'Servewell', rsp: 503, promo: '', cgst: 9, stock: 2 },
  { icode: 'OB28874', ean: '8907521496522', article: '25007004', division: 'Tableware', section: 'Drinking Glasses', department: 'Water Glass', itemDesc: 'TUMBLER BEER MONACO 11998120 1PC', brand: 'Devnow', rsp: 495, promo: 'BUY1@20%', cgst: 9, stock: 1 },
  { icode: 'OB21848', ean: '8907521456311', article: '45017762', division: 'Tableware', section: 'Serveware', department: 'Serving Tray', itemDesc: 'TRAY RE MEDIUM 14 X 8 MORE PEACH 26', brand: 'Atijo F', rsp: 1295, promo: 'Buy1@10%', cgst: 2.5, stock: 0 },
  { icode: 'OB33549', ean: '8907521542892', article: '45008916', division: 'Kitchenware', section: 'Cookware', department: 'Milk Boiler', itemDesc: 'MILK BOILER WITH LID ARGENT ESSENTIALS BGD 9811 14CM', brand: 'Bergner', rsp: 2945, promo: 'Buy1 or 2 20% and Buy3 Get More 30%', cgst: 2.5, stock: 3 },
  { icode: 'OB31696', ean: '8907521524911', article: '45008580', division: 'Kitchenware', section: 'Cookware', department: 'Kadhai', itemDesc: 'KADHAI WITH LID JUNIOR CHEF BGN 6742 12CM', brand: 'Bergner', rsp: 1495, promo: 'Buy1 or 2 20% and Buy3 Get More 30%', cgst: 2.5, stock: 9 },
  { icode: 'OB34083', ean: '8907521548238', article: '25005119', division: 'Tableware', section: 'Dinnerware', department: 'Dinner Set', itemDesc: 'DINNER SET CELESTIAN 27PCS', brand: 'Cello Crockery', rsp: 4149, promo: 'BUY1@20%', cgst: 9, stock: 1 },
] as const

const STORES = [
  { name: 'Parle Square Mall', lift: 1, staff: ['Rohit Sharma', 'Amit Sharma'] },
  { name: 'Inorbit Malad', lift: 0.82, staff: ['Neha Patel', 'Amit Sharma'] },
  { name: 'Phoenix Marketcity', lift: 1.18, staff: ['Karan Mehta', 'Rohit Sharma'] },
] as const

const DATES = ['03-11-2026', '04-11-2026', '05-11-2026', '06-11-2026', '07-11-2026', '08-11-2026', '09-11-2026']
const WEEKEND = new Set(['07-11-2026', '08-11-2026'])
const CUSTOMERS = ['Nilam', 'ONE PVT .', 'MR', 'KRASHN DEV GIRI', 'POOJA', 'jigna', 'swapnil', 'NAINA .', 'jeha', 'mr', '']

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 2 ** 32
}

function drawQty(seed: string, base: number): number {
  const u = hash(seed)
  if (u > Math.min(0.72, 0.28 + base * 0.12)) return 0
  if (u > 0.92) return 3
  if (u > 0.78) return 2
  return 1
}

export function buildSampleRows(): SaleRow[] {
  const lines = [
    'STORE_NAME\tBILL_DATE\tCUSTOMER_NAME\tSALES_PERSON_NAME\tBILL_NO\tRETURN_BILLNO\tBILL_DATE\tBILL_QUANTITY\tICODE\tEAN\tARTICLE\tDIVISION\tSECTION\tDEPARTMENT\tITEM DESC\tBRAND\tRSP\tPROMO_CODE\tTAXABLE_AMOUNT\tCGST %\tSGST %\tNET_Amount\tSTOCK IN HAND',
  ]
  let billSeq = 5200
  for (const store of STORES) {
    for (const date of DATES) {
      const weekendLift = WEEKEND.has(date) ? 1.35 : 1
      for (const sku of CATALOG) {
        const intensity = (sku.rsp < 400 ? 1.4 : sku.rsp > 2500 ? 0.55 : 1) * store.lift * weekendLift
        const qty = drawQty(`${store.name}|${date}|${sku.icode}`, intensity)
        if (!qty) continue
        billSeq += 1
        const person = store.staff[Math.floor(hash(`${date}${sku.icode}`) * store.staff.length)]
        const customer = CUSTOMERS[Math.floor(hash(`${sku.icode}${date}c`) * CUSTOMERS.length)]
        const discount = sku.promo ? (sku.promo.includes('50') ? 0.5 : sku.promo.includes('30') ? 0.2 : sku.promo.includes('20') ? 0.2 : 0.1) : 0
        const net = Number((sku.rsp * qty * (1 - discount)).toFixed(2))
        const taxRate = (sku.cgst * 2) / 100
        const taxable = Number((net / (1 + taxRate)).toFixed(2))
        const prefix = store.name === 'Parle Square Mall' ? 'A01' : store.name === 'Inorbit Malad' ? 'A02' : 'A03'
        lines.push(
          [
            store.name,
            date,
            customer,
            person,
            `${prefix}/C0${billSeq}/Nov26`,
            '',
            date,
            qty,
            sku.icode,
            sku.ean,
            sku.article,
            sku.division,
            sku.section,
            sku.department,
            sku.itemDesc,
            sku.brand,
            sku.rsp,
            sku.promo,
            taxable,
            sku.cgst,
            sku.cgst,
            net,
            sku.stock,
          ].join('\t'),
        )
      }
    }
  }
  return parseSalesText(lines.join('\n'))
}

export const SAMPLE_ROWS = buildSampleRows()
