export interface User {
  id: number
  name: string
  email: string
  country: string
}

export interface Product {
  id: number
  name: string
  category: string
  price: string
  stock: number
}

export interface Order {
  id: number
  status: OrderStatus
  quantity: number
  total_amount: string
  created_at: string
  user: User
  product: Product
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export interface OrderListResponse {
  data: Order[]
  next_cursor: string | null
  has_next: boolean
  total: number
}

export interface StatusBreakdown {
  status: string
  count: number
}

export interface MetaResponse {
  total_orders: number
  total_users: number
  total_products: number
  status_breakdown: StatusBreakdown[]
  avg_order_value: string
}

export interface OrderFilters {
  status?: string
  search?: string
  sort_by?: string
  sort_dir?: "asc" | "desc"
  min_amount?: number
  max_amount?: number
}
