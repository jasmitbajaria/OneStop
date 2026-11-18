import { Upload } from 'lucide-react'
import { useState, type DragEvent } from 'react'

type Props = {
  onFile: (file: File) => void
  busy?: boolean
  compact?: boolean
}

export function FilePicker({ onFile, busy, compact }: Props) {
  const [over, setOver] = useState(false)

  function takeFile(file: File | undefined) {
    if (file && !busy) onFile(file)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setOver(false)
    takeFile(event.dataTransfer.files[0])
  }

  if (compact) {
    return (
      <label className="gold-ring flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#e2b657]/10 px-3 py-3 text-sm text-[#e2b657]">
        <Upload size={16} />
        {busy ? 'Reading file…' : 'Upload Excel or CSV'}
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.tsv,.txt"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            takeFile(e.target.files?.[0])
            e.currentTarget.value = ''
          }}
        />
      </label>
    )
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`gold-ring flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-6 py-10 text-center transition ${
        over ? 'border-[#e2b657] bg-[#e2b657]/16' : 'border-[#e2b657]/35 bg-[#e2b657]/8'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e2b657]/15 text-[#e2b657]">
        <Upload size={22} />
      </span>
      <span className="text-lg text-[#f4efe6]">
        {busy ? 'Reading your sales file…' : 'Upload a file to predict'}
      </span>
      <span className="max-w-sm text-sm text-[#b9b0a2]">
        Drop an Excel or CSV export here, or click to browse. Use STORE_NAME, BILL_DATE, ICODE and BILL_QUANTITY.
      </span>
      <input
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv,.tsv,.txt"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          takeFile(e.target.files?.[0])
          e.currentTarget.value = ''
        }}
      />
    </label>
  )
}
