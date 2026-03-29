import axios from "axios"
import { MetaResponse, Order, OrderFilters, OrderListResponse } from "./types"

const api = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.INTERNAL_API_URL || "http://localhost:8000"
      : "",
  timeout: 10000,
})

export async function fetchOrders(
  filters: OrderFilters & { cursor?: string; limit?: number },
): Promise<OrderListResponse> {
  const params: Record<string, string | number> = {}

  if (filters.cursor) params.cursor = filters.cursor
  if (filters.limit) params.limit = filters.limit
  if (filters.status) params.status = filters.status
  if (filters.search) params.search = filters.search
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_dir) params.sort_dir = filters.sort_dir
  if (filters.min_amount !== undefined) params.min_amount = filters.min_amount
  if (filters.max_amount !== undefined) params.max_amount = filters.max_amount

  const { data } = await api.get<OrderListResponse>("/api/orders", { params })
  return data
}

export async function fetchOrder(id: number): Promise<Order> {
  const { data } = await api.get<Order>(`/api/orders/${id}`)
  return data
}

export async function fetchMeta(): Promise<MetaResponse> {
  const { data } = await api.get<MetaResponse>("/api/orders/meta")
  return data
}
