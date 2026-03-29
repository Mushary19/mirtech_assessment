"use client"

import { fetchOrders } from "@/lib/api"
import { Order, OrderFilters } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useRef } from "react"
import { getColumns } from "./columns"

const ROW_HEIGHT = 56
const LIMIT = 50
const FETCH_THRESHOLD = 10

interface OrdersTableProps {
  filters: OrderFilters
  onTotalChange: (total: number) => void
}

export function OrdersTable({ filters, onTotalChange }: OrdersTableProps) {
  const router = useRouter()
  const parentRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["orders", filters],
    queryFn: async ({ pageParam }) => {
      const result = await fetchOrders({
        ...filters,
        cursor: pageParam as string | undefined,
        limit: LIMIT,
      })
      onTotalChange(result.total)
      return result
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? (lastPage.next_cursor ?? undefined) : undefined,
    staleTime: 30 * 1000,
  })

  const allOrders = useMemo<Order[]>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  )

  const handleRowClick = useCallback(
    (id: number) => router.push(`/orders/${id}`),
    [router],
  )

  const handleSort = useCallback((field: string) => {
    const event = new CustomEvent("table-sort", { detail: field })
    window.dispatchEvent(event)
  }, [])

  const columns = useMemo(
    () =>
      getColumns(
        filters.sort_by ?? "created_at",
        filters.sort_dir ?? "desc",
        handleSort,
        handleRowClick,
      ),
    [filters.sort_by, filters.sort_dir, handleSort, handleRowClick],
  )

  const table = useReactTable({
    data: allOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  })

  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: hasNextPage ? rows.length + 1 : rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const lastItem = virtualItems[virtualItems.length - 1]
  if (
    lastItem &&
    lastItem.index >= rows.length - FETCH_THRESHOLD &&
    hasNextPage &&
    !isFetchingNextPage
  ) {
    fetchNextPage()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading orders..</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm font-medium text-red-600">
            Failed to load orders
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {(error as Error)?.message ?? "Unknown error"}
          </p>
        </div>
      </div>
    )
  }

  if (allOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">
          No orders match your filters.
        </p>
      </div>
    )
  }

  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-white">
      <div className="border-b border-border bg-muted/30">
        {table.getHeaderGroups().map((headerGroup) => (
          <div key={headerGroup.id} className="flex items-center px-4 py-3">
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                style={{
                  width: header.column.columnDef.size,
                  minWidth: header.column.columnDef.size,
                }}
                className="flex-shrink-0 pr-4"
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}
      >
        <div style={{ height: totalSize, position: "relative" }}>
          {paddingTop > 0 && <div style={{ height: paddingTop }} />}

          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index]

            if (!row) {
              return (
                <div
                  key="loader"
                  style={{ height: ROW_HEIGHT }}
                  className="flex items-center justify-center"
                >
                  {isFetchingNextPage && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )
            }

            return (
              <div
                key={row.id}
                style={{ height: ROW_HEIGHT }}
                onClick={() => handleRowClick(row.original.id)}
                className={cn(
                  "flex items-center px-4 border-b border-border/50 cursor-pointer transition-colors",
                  "hover:bg-muted/40 active:bg-muted/60",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{
                      width: cell.column.columnDef.size,
                      minWidth: cell.column.columnDef.size,
                    }}
                    className="flex-shrink-0 pr-4"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )
          })}

          {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 bg-muted/20 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {allOrders.length.toLocaleString()} loaded rows
        </p>
        {isFetchingNextPage && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Fetching more...
          </div>
        )}
      </div>
    </div>
  )
}
