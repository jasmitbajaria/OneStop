export type Horizon = 7 | 15 | 30

export type SaleRow = {
  storeName: string
  billDate: string
  customerName: string
  salesPerson: string
  billNo: string
  returnBillNo: string
  quantity: number
  icode: string
  ean: string
  article: string
  division: string
  section: string
  department: string
  itemDesc: string
  brand: string
  rsp: number
  promoCode: string
  taxableAmount: number
  cgstPct: number
  sgstPct: number
  netAmount: number
  stockInHand: number
}

export type ProductMeta = {
  icode: string
  ean: string
  article: string
  division: string
  section: string
  department: string
  itemDesc: string
  brand: string
  rsp: number
}

export type DailyPoint = {
  date: string
  qty: number
  net: number
  promoShare: number
}

export type ChartPoint = {
  date: string
  label: string
  actual: number | null
  fitted: number | null
  forecast: number | null
  lo: number | null
  hi: number | null
  kind: 'history' | 'forecast'
}

export type SkuForecast = {
  storeName: string
  product: ProductMeta
  stockInHand: number
  avgRsp: number
  avgNetPerUnit: number
  history: DailyPoint[]
  model: 'TSB' | 'Holt'
  adi: number
  cv2: number
  demandClass: 'smooth' | 'erratic' | 'intermittent' | 'lumpy'
  dailyMean: number
  dailyForecast: number[]
  dailyLo: number[]
  dailyHi: number[]
  horizonQty: Record<Horizon, number>
  horizonLo: Record<Horizon, number>
  horizonHi: Record<Horizon, number>
  horizonRevenue: Record<Horizon, number>
  stockoutDay: Partial<Record<Horizon, number | null>>
  inSampleMape: number | null
  promoRate: number
}

export type StoreSummary = {
  storeName: string
  bills: number
  units: number
  revenue: number
  skuCount: number
}
