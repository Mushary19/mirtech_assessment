"use client"

import { StatusBadge } from "@/components/ui/StatusBadge"
import { fetchOrder } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { ArrowLeft, Hash, Loader2, Package, User } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">
        {value}
      </span>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(Number(id)),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading order..</p>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-red-600">Order not found</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to orders
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Order #{order.id}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Placed on{" "}
                {format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <Section title="Order Details" icon={Hash}>
          <DetailRow label="Order ID" value={`#${order.id}`} />
          <DetailRow
            label="Status"
            value={<StatusBadge status={order.status} />}
          />
          <DetailRow label="Quantity" value={order.quantity} />
          <DetailRow
            label="Total Amount"
            value={
              <span className="text-lg font-semibold">
                $
                {parseFloat(order.total_amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            }
          />
          <DetailRow
            label="Date"
            value={format(new Date(order.created_at), "PPP")}
          />
        </Section>

        <Section title="Customer" icon={User}>
          <DetailRow label="Name" value={order.user.name} />
          <DetailRow label="Email" value={order.user.email} />
          <DetailRow label="Country" value={order.user.country} />
        </Section>

        <Section title="Product" icon={Package}>
          <DetailRow label="Name" value={order.product.name} />
          <DetailRow label="Category" value={order.product.category} />
          <DetailRow
            label="Unit Price"
            value={`$${parseFloat(order.product.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <DetailRow
            label="Stock Remaining"
            value={order.product.stock.toLocaleString()}
          />
        </Section>

        <div className="bg-foreground text-background rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-70">Order Total</p>
              <p className="text-3xl font-bold tabular-nums mt-1">
                $
                {parseFloat(order.total_amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-70">
                {order.quantity} × {order.product.name}
              </p>
              <p className="text-sm opacity-70 mt-1">
                @ $
                {parseFloat(order.product.price).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                each
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
