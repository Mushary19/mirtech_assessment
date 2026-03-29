"use client"

import { StatusBadge } from "@/components/ui/StatusBadge"
import { Order } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

interface SortableHeaderProps {
  label: string
  field: string
  currentSort: string
  currentDir: "asc" | "desc"
  onSort: (field: string) => void
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort === field
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentDir === "desc" ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUp className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  )
}

export function getColumns(
  sortBy: string,
  sortDir: "asc" | "desc",
  onSort: (field: string) => void,
  onRowClick: (id: number) => void,
): ColumnDef<Order>[] {
  return [
    {
      accessorKey: "id",
      header: () => (
        <SortableHeader
          label="Order ID"
          field="id"
          currentSort={sortBy}
          currentDir={sortDir}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.id}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "user.name",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Customer
        </span>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {row.original.user.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {row.original.user.email}
          </p>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "user.country",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Country
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.user.country}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "product.name",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Product
        </span>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm truncate">{row.original.product.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.product.category}
          </p>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "status",
      header: () => (
        <SortableHeader
          label="Status"
          field="status"
          currentSort={sortBy}
          currentDir={sortDir}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 110,
    },
    {
      accessorKey: "quantity",
      header: () => (
        <SortableHeader
          label="Qty"
          field="quantity"
          currentSort={sortBy}
          currentDir={sortDir}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.quantity}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "total_amount",
      header: () => (
        <SortableHeader
          label="Total"
          field="total_amount"
          currentSort={sortBy}
          currentDir={sortDir}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          $
          {parseFloat(row.original.total_amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: "created_at",
      header: () => (
        <SortableHeader
          label="Date"
          field="created_at"
          currentSort={sortBy}
          currentDir={sortDir}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
        </span>
      ),
      size: 110,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRowClick(row.original.id)
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          View
        </button>
      ),
      size: 50,
    },
  ]
}
