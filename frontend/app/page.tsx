"use client"

import { OrdersTable } from "@/components/OrdersTable"
import { TableFilters } from "@/components/TableFilters"
import { fetchMeta } from "@/lib/api"
import { OrderFilters } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-white border border-border rounded-xl p-4 flex items-center gap-4",
        className,
      )}
    >
      <div className="p-2.5 bg-muted rounded-lg">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [filters, setFilters] = useState<OrderFilters>({
    sort_by: "created_at",
    sort_dir: "desc",
  })
  const [total, setTotal] = useState(0)

  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: fetchMeta,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const handleSort = (e: Event) => {
      const field = (e as CustomEvent<string>).detail
      setFilters((prev) => ({
        ...prev,
        sort_by: field,
        sort_dir:
          prev.sort_by === field && prev.sort_dir === "desc" ? "asc" : "desc",
      }))
    }
    window.addEventListener("table-sort", handleSort)
    return () => window.removeEventListener("table-sort", handleSort)
  }, [])

  const handleFiltersChange = useCallback((newFilters: OrderFilters) => {
    setFilters((prev) => ({
      sort_by: prev.sort_by,
      sort_dir: prev.sort_dir,
      ...newFilters,
    }))
  }, [])

  const handleTotalChange = useCallback((t: number) => {
    setTotal(t)
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            High-performance table —{" "}
            {meta?.total_orders.toLocaleString() ?? "—"} records
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={meta?.total_orders.toLocaleString() ?? "—"}
            icon={ShoppingCart}
          />
          <StatCard
            label="Customers"
            value={meta?.total_users.toLocaleString() ?? "—"}
            icon={Users}
          />
          <StatCard
            label="Products"
            value={meta?.total_products.toLocaleString() ?? "—"}
            icon={Package}
          />
          <StatCard
            label="Avg Order Value"
            value={
              meta ? `$${parseFloat(meta.avg_order_value).toFixed(2)}` : "—"
            }
            icon={TrendingUp}
          />
        </div>

        <div className="flex flex-col gap-4">
          <TableFilters
            filters={filters}
            total={total}
            onFiltersChange={handleFiltersChange}
          />
          <OrdersTable filters={filters} onTotalChange={handleTotalChange} />
        </div>
      </div>
    </main>
  )
}
