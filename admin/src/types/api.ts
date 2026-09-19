/**
 * Shared API envelope shapes returned by the SriPon backend.
 */

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: Pagination;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors: Record<string, string[]>;
  status?: number;
}

/* ============================================================
 * Admin resource types (mirrors the Phase 12/13 backend shapes)
 * ============================================================ */

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  banner?: string | null;
  parent?: number | null;
  sort_order: number;
  active: boolean;
  product_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminCustomer {
  id: number;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string | null;
  active: boolean;
  order_count: number;
  total_spent: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface AdminOrderItem {
  id: number;
  product: { id: number; slug: string } | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  discount: string;
  tax_percent: string;
  final_price: string;
  line_total: string;
}

export interface AdminOrderStatusEntry {
  from_status: string;
  to_status: string;
  note: string;
  actor_type: string;
  actor: string;
  created_at: string;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  customer?: AdminOrderCustomer;
  order_status: string;
  payment_status: string;
  subtotal?: string;
  discount?: string;
  tax?: string;
  delivery_fee?: string;
  total: string;
  item_count: number;
  placed_at: string;
}

export interface AdminOrderDetail extends AdminOrder {
  coupon_code?: string;
  notes?: string;
  admin_notes?: string;
  address_snapshot?: unknown;
  items: AdminOrderItem[];
  status_history: AdminOrderStatusEntry[];
}

export interface AdminCoupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  minimum_order_value?: string;
  maximum_discount?: string;
  start_date?: string | null;
  expiry_date?: string | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  active: boolean;
  usage_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminBannerVariant {
  variant: string;
  url: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface AdminBanner {
  id: number;
  title: string;
  subtitle?: string;
  placement: string;
  cta_text?: string;
  cta_action?: string;
  link_product?: number | null;
  link_category?: number | null;
  custom_url?: string;
  overlay_text_enabled?: boolean;
  text_alignment?: string;
  button_visible?: boolean;
  display_priority?: number;
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
  manager?: number | null;
  images: AdminBannerVariant[];
  created_at: string;
  updated_at: string;
}

export interface AdminHomeSection {
  id: number;
  section_type: string;
  title: string;
  subtitle?: string | null;
  enabled: boolean;
  display_order: number;
  content_type: string;
  linked_banner?: number | null;
  linked_categories?: number[];
  linked_products?: number[];
  max_items?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSetting {
  id: number;
  key: string;
  value: string;
  group: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminInventoryEntry {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  supabase_uid: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Dashboard aggregates from GET /admin/dashboard/. */
export interface DashboardStats {
  total_revenue: string;
  total_orders: number;
  average_order_value: string;
  pending_orders: number;
  processing_orders: number;
  today_revenue: string;
  today_orders: number;
  total_customers: number;
  total_products: number;
  active_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export interface DashboardPayload {
  stats: DashboardStats;
  sales_trend: { date: string; orders: number; revenue: string }[];
  recent_orders: AdminOrder[];
}

/** Analytics payload from GET /admin/analytics/. */
export interface AnalyticsPayload {
  days: number;
  granularity: string;
  trend: { date: string; orders: number; revenue: string; items: number; aov: string }[];
  order_status_counts: { order_status: string; count: number }[];
  payment_status_counts: { payment_status: string; count: number }[];
  payment_provider_counts: { payments__provider: string | null; count: number }[];
  summary: { orders: number; revenue: string; aov: string };
}

export interface CategorySalesRow {
  category_id: number | null;
  category_name: string;
  units: number;
  revenue: string;
}

export interface TopProductRow {
  id: number;
  name: string;
  sku: string;
  units_sold: number;
  revenue: string;
}

export interface TopCustomerRow {
  customer_id: number | null;
  name: string;
  email: string;
  orders: number;
  spent: string;
}

/** Admin product (ProductAdminDetailSerializer). */
export interface AdminProduct {
  id: number;
  category: { id: number; name: string } | null;
  sku: string;
  product_code?: string;
  brand?: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  mrp: string;
  price: string;
  discount_price?: string | null;
  effective_price: string;
  discount_percent?: string;
  tax: string;
  unit: string;
  available_quantity: number;
  in_stock: boolean;
  stock_quantity?: number;
  reserved_quantity?: number;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number;
  weight?: number;
  specifications?: string;
  highlights?: string;
  meta?: unknown;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new: boolean;
  is_active: boolean;
  primary_image?: { secure_url?: string } | null;
  images?: { secure_url?: string }[];
  created_at?: string;
  updated_at?: string;
}