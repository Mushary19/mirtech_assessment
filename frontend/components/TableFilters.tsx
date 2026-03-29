"use client"

import { OrderFilters, OrderStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"

const STATUSES: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

interface TableFiltersProps {
  filters: OrderFilters
  total: number
  onFiltersChange: (filters: OrderFilters) => void
}

export function TableFilters({
  filters,
  total,
  onFiltersChange,
}: TableFiltersProps) {
  const [showAmountFilter, setShowAmountFilter] = useState(false)
  const [minInput, setMinInput] = useState(filters.min_amount?.toString() ?? "")
  const [maxInput, setMaxInput] = useState(filters.max_amount?.toString() ?? "")
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onFiltersChange({ ...filters, search: value || undefined })
      }, 300)
    },
    [filters, onFiltersChange],
  )

  const handleStatus = (status: string) => {
    onFiltersChange({ ...filters, status: status || undefined })
  }

  const handleAmountApply = () => {
    onFiltersChange({
      ...filters,
      min_amount: minInput ? parseFloat(minInput) : undefined,
      max_amount: maxInput ? parseFloat(maxInput) : undefined,
    })
  }

  const handleClearAll = () => {
    if (searchRef.current) searchRef.current.value = ""
    setMinInput("")
    setMaxInput("")
    onFiltersChange({})
  }

  const hasFilters =
    filters.search ||
    filters.status ||
    filters.min_amount !== undefined ||
    filters.max_amount !== undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search customer, email, product..."
            defaultValue={filters.search ?? ""}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatus(s.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                (filters.status ?? "") === s.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAmountFilter((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
            showAmountFilter ||
              filters.min_amount !== undefined ||
              filters.max_amount !== undefined
              ? "bg-foreground text-background border-foreground"
              : "bg-white text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Amount
        </button>

        {hasFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        {/* <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {total.toLocaleString()} orders
        </span> */}
      </div>

      {showAmountFilter && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border w-fit">
          <span className="text-xs text-muted-foreground font-medium">
            Amount:
          </span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <input
              type="number"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="w-24 pl-5 pr-2 py-1.5 text-xs border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
          </div>
          <span className="text-xs text-muted-foreground">—</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <input
              type="number"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="w-24 pl-5 pr-2 py-1.5 text-xs border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
          </div>
          <button
            onClick={handleAmountApply}
            className="px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded-md hover:opacity-80 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
