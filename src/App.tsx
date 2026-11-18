import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  Store,
  Sparkles,
  Boxes,
  TrendingUp,
} from 'lucide-react'
import { parseSalesFile } from './lib/parse'
import { FilePicker } from './components/FilePicker'
import {
  compact,
  forecastStoreCatalog,
  inr,
  storeSummaries,
  toChartPoints,
  uniqueSorted,
} from './lib/forecast'
import { ForecastChart } from './components/ForecastChart'
import type { Horizon, SaleRow } from './types'

const HORIZON_OPTIONS: { value: Horizon; label: string; hint: string }[] = [
  { value: 7, label: 'Weekly', hint: 'Next 7 days' },
  { value: 15, label: '15 days', hint: 'Next fortnight' },
  { value: 30, label: 'Monthly', hint: 'Next 30 days' },
]

export default function App() {
  const [rows, setRows] = useState<SaleRow[]>([])
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [horizon, setHorizon] = useState<Horizon>(7)
  const [storeName, setStoreName] = useState('')
  const [query, setQuery] = useState('')
  const [icode, setIcode] = useState('')

  const summaries = useMemo(() => storeSummaries(rows), [rows])
  const stores = summaries.map((s) => s.storeName)
  const activeStore = stores.includes(storeName) ? storeName : stores[0] ?? ''

  const catalog = useMemo(
    () => (activeStore ? forecastStoreCatalog(rows, activeStore) : []),
    [rows, activeStore],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((sku) =>
      [sku.product.itemDesc, sku.product.icode, sku.product.brand, sku.product.department]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [catalog, query])

  const selected = filtered.find((s) => s.product.icode === icode) ?? filtered[0]
  const chart = selected ? toChartPoints(selected, horizon) : []
  const storeKpis = summaries.find((s) => s.storeName === activeStore)
  const storeUnits = catalog.reduce((a, s) => a + s.horizonQty[horizon], 0)
  const storeRevenue = catalog.reduce((a, s) => a + s.horizonRevenue[horizon], 0)
  const stockouts = catalog.filter((s) => s.stockoutDay[horizon] != null).length
  const daysCovered = uniqueSorted(rows.map((r) => r.billDate)).length
  const historyNote =
    daysCovered < 21
      ? `Only ${daysCovered} day${daysCovered === 1 ? '' : 's'} of history. Weekly is the most reliable horizon; 15-day and monthly bands widen on purpose.`
      : `${daysCovered} days of history loaded.`

  async function onUpload(file: File) {
    setBusy(true)
    setError('')
    try {
      const { rows: parsed, detail } = await parseSalesFile(file)
      if (!parsed.length) {
        setError(
          `Could not read sales rows from this file. ${detail}. Needed columns: STORE_NAME, BILL_DATE (or BILL_DA…), ICODE, BILL_QUANTITY.`,
        )
        return
      }
      setRows(parsed)
      setStoreName(parsed[0].storeName)
      setQuery('')
      setIcode('')
      setSource(`${detail} · ${parsed.length} rows`)
    } catch {
      setError('The file could not be parsed. Upload .xlsx, .xls, .csv or .tsv.')
    } finally {
      setBusy(false)
    }
  }

  if (!rows.length) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-xl rounded-[32px] p-8 md:p-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#e2b657]">OneStop</p>
          <h1 className="font-display mt-3 text-4xl leading-tight md:text-5xl">
            Welcome to OneStop demand forecasting tool
          </h1>
          <p className="mt-4 text-base leading-7 text-[#b9b0a2]">
            Upload your store sales file to predict weekly, 15-day and monthly demand by store and product. Nothing is forecast until you add data.
          </p>
          <div className="mt-8">
            <FilePicker onFile={(file) => void onUpload(file)} busy={busy} />
          </div>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_1fr] lg:px-6 lg:py-6">
        <aside className="panel h-fit rounded-3xl p-5">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#e2b657]">OneStop</p>
            <h1 className="font-display mt-1 text-3xl leading-none">Demand desk</h1>
            <p className="mt-2 text-sm text-[#b9b0a2]">Store-wise unit forecasts from POS lines.</p>
          </div>

          <FilePicker onFile={(file) => void onUpload(file)} busy={busy} compact />
          <p className="mt-2 text-xs text-[#b9b0a2]">{source}</p>
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => {
              setRows([])
              setStoreName('')
              setSource('')
              setQuery('')
              setIcode('')
              setError('')
            }}
            className="mt-3 text-xs text-[#b9b0a2] underline-offset-2 hover:text-[#e2b657] hover:underline"
          >
            Start over
          </button>

          <div className="mt-6 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9b0a2]">Stores</p>
            {summaries.map((store) => {
              const active = store.storeName === activeStore
              return (
                <button
                  key={store.storeName}
                  onClick={() => {
                    setStoreName(store.storeName)
                    setIcode('')
                  }}
                  className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                    active ? 'bg-[#e2b657] text-[#1a140c]' : 'bg-white/5 text-[#f4efe6] hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Store size={14} />
                      {store.storeName}
                    </span>
                    <span className="text-xs opacity-80">{store.skuCount} SKUs</span>
                  </div>
                  <p className={`mt-1 text-xs ${active ? 'text-[#1a140c]/70' : 'text-[#b9b0a2]'}`}>
                    {compact(store.units)} units · {inr(store.revenue)}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-white/4 p-3 text-xs leading-5 text-[#b9b0a2]">
            SKU-store demand is mostly intermittent, so the engine uses <span className="text-[#f4efe6]">TSB</span> for sparse items and <span className="text-[#f4efe6]">Holt trend</span> for regular movers, then shrinks toward the store-department rate.
          </div>
        </aside>

        <main className="space-y-5">
          <header className="panel flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#e2b657]">Forecast horizon</p>
              <h2 className="font-display mt-1 text-4xl">{activeStore || 'Select a store'}</h2>
              <p className="mt-2 max-w-xl text-sm text-[#b9b0a2]">{historyNote}</p>
            </div>
            <div className="flex rounded-2xl bg-black/30 p-1">
              {HORIZON_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setHorizon(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    horizon === option.value ? 'bg-[#e2b657] text-[#1a140c]' : 'text-[#b9b0a2]'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-[11px] opacity-80">{option.hint}</div>
                </button>
              ))}
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={<CalendarRange size={16} />} label="History in file" value={`${daysCovered} days`} hint={`${rows.length} line items`} />
            <Kpi icon={<Boxes size={16} />} label={`${horizon}-day units`} value={compact(storeUnits)} hint={storeKpis ? `${storeKpis.skuCount} products in this store` : ''} />
            <Kpi icon={<TrendingUp size={16} />} label="Expected net" value={inr(storeRevenue)} hint="Qty × recent net per unit" />
            <Kpi icon={<AlertTriangle size={16} />} label="Stock-out risk" value={`${stockouts} SKUs`} hint="Forecast exceeds stock on hand" />
          </section>

          <section className="panel rounded-3xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#e2b657]">Selected product</p>
                <h3 className="font-display text-2xl">{selected?.product.itemDesc ?? 'No SKU in this store'}</h3>
                {selected ? (
                  <p className="mt-1 text-sm text-[#b9b0a2]">
                    {selected.product.icode} · {selected.product.brand} · {selected.product.department} · {selected.model} · {selected.demandClass}
                  </p>
                ) : null}
              </div>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIcode('')
                }}
                placeholder="Search ICODE, brand, description"
                className="w-full shrink-0 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none lg:w-80"
              />
            </div>

            {selected ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <Mini label="Predicted units" value={compact(selected.horizonQty[horizon], 1)} sub={`${compact(selected.horizonLo[horizon], 1)} – ${compact(selected.horizonHi[horizon], 1)}`} />
                  <Mini label="Predicted net" value={inr(selected.horizonRevenue[horizon])} sub={`RSP ${inr(selected.avgRsp)}`} />
                  <Mini label="Stock in hand" value={compact(selected.stockInHand)} sub={selected.stockoutDay[horizon] ? `Likely stock-out in ${selected.stockoutDay[horizon]} days` : 'Cover looks adequate'} />
                  <Mini label="Fit check" value={selected.inSampleMape == null ? 'n/a' : `${compact(selected.inSampleMape, 0)}% MAPE`} sub={`ADI ${compact(selected.adi, 2)} · promo ${compact(selected.promoRate * 100, 0)}%`} />
                </div>
                <div className="mt-4">
                  <ForecastChart data={chart} />
                </div>
              </>
            ) : null}
          </section>

          <section className="panel overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#e2b657]">Store ranking</p>
                <h3 className="font-display text-xl">Every product at {activeStore}</h3>
              </div>
              <Sparkles size={16} className="text-[#e2b657]" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.14em] text-[#b9b0a2]">
                  <tr className="border-y border-white/8">
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 font-medium">Stock</th>
                    <th className="px-5 py-3 font-medium">7d</th>
                    <th className="px-5 py-3 font-medium">15d</th>
                    <th className="px-5 py-3 font-medium">30d</th>
                    <th className="px-5 py-3 font-medium">Net {horizon}d</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sku) => {
                    const active = sku.product.icode === selected?.product.icode
                    return (
                      <tr
                        key={sku.product.icode}
                        onClick={() => setIcode(sku.product.icode)}
                        className={`cursor-pointer border-b border-white/6 ${active ? 'bg-[#e2b657]/12' : 'hover:bg-white/4'}`}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium">{sku.product.itemDesc}</div>
                          <div className="text-xs text-[#b9b0a2]">{sku.product.icode} · {sku.product.brand}</div>
                        </td>
                        <td className="px-5 py-3 text-[#b9b0a2]">{sku.model}</td>
                        <td className="px-5 py-3">
                          {sku.stockInHand}
                          {sku.stockoutDay[horizon] ? <span className="ml-2 text-xs text-rose-300">risk</span> : null}
                        </td>
                        <td className="px-5 py-3">{compact(sku.horizonQty[7], 1)}</td>
                        <td className="px-5 py-3">{compact(sku.horizonQty[15], 1)}</td>
                        <td className="px-5 py-3">{compact(sku.horizonQty[30], 1)}</td>
                        <td className="px-5 py-3">{inr(sku.horizonRevenue[horizon])}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="panel rounded-3xl p-4">
      <div className="flex items-center gap-2 text-[#e2b657]">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="font-display mt-2 text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[#b9b0a2]">{hint}</p>
    </div>
  )
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-black/25 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#b9b0a2]">{label}</p>
      <p className="mt-1 text-xl">{value}</p>
      <p className="mt-1 text-xs text-[#b9b0a2]">{sub}</p>
    </div>
  )
}
