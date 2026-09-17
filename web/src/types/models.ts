export interface CategoryMini { id: number; name: string; slug: string; }

export interface ProductImage {
  id: number;
  public_id: string;
  secure_url: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  is_primary: boolean;
  sort_order: number;
}

export interface PrimaryImage {
  secure_url: string;
  public_id: string;
  alt_text: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  product_code: string;
  brand: string;
  short_description: string;
  category: CategoryMini;
  mrp: string;
  price: string;
  discount_price: string;
  effective_price: string;
  discount_percent: string;
  tax: string;
  unit: string;
  available_quantity: number;
  in_stock: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new: boolean;
  primary_image: PrimaryImage | null;
}

export interface ProductDetail extends ProductListItem {
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  weight: string;
  minimum_order_quantity: number;
  maximum_order_quantity: number;
  meta: Record<string, unknown>;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface CategoryListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  banner: string | null;
  parent: number | null;
  sort_order: number;
  product_count: number;
}

export interface BannerImage {
  variant: string;
  url: string;
  width: number | null;
  height: number | null;
  alt_text: string;
}

export interface BannerCta {
  action: string;
  label: string;
  product_id: number | null;
  product_slug: string | null;
  category_id: number | null;
  category_slug: string | null;
  url: string | null;
}

export interface BannerListItem {
  id: number;
  title: string;
  subtitle: string;
  placement: string;
  cta: BannerCta;
  text_alignment: string;
  button_visible: boolean;
  overlay_text_enabled: boolean;
  images: Record<string, BannerImage>;
}

export interface HomeSection {
  id: number;
  section_type: string;
  title: string;
  subtitle: string;
  content_type: string;
  payload: ProductListItem[] | CategoryListItem[] | BannerListItem | null;
}

export interface UserProfile {
  id: number;
  firebase_uid: string;
  name: string;
  email: string;
  phone: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: number;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  unit: string;
  price: string;
  mrp: string;
  discount_price: string;
  effective_price: string;
  discount_percent: string;
  available_quantity: number;
  in_stock: boolean;
  minimum_order_quantity: number;
  maximum_order_quantity: number;
  is_active: boolean;
  primary_image: PrimaryImage | null;
}

export interface CartItem {
  id: number;
  product: CartProduct;
  quantity: number;
  unit_price: string;
  line_total: string;
  mrp_line_total: string;
  tax_total: string;
  is_available: boolean;
  added_at: string;
}

export interface CartSummary {
  id: number;
  item_count: number;
  line_count: number;
  items: CartItem[];
  subtotal: string;
  mrp_total: string;
  discount_total: string;
  tax_total: string;
  total: string;
  currency: string;
  updated_at: string;
}

export interface WishlistItem {
  id: number;
  product: ProductListItem;
  added_at: string;
}

export interface OrderItem {
  id: number;
  product: { id: number; slug: string; name: string } | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  discount: string;
  tax_percent: string;
  final_price: string;
  line_total: string;
}

export interface StatusHistory {
  from_status: string;
  to_status: string;
  note: string;
  actor_type: string;
  actor: string | null;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: string;
  discount: string;
  tax: string;
  delivery_fee: string;
  total: string;
  item_count: number;
  placed_at: string | null;
}

export interface OrderDetail extends OrderSummary {
  customer: UserProfile;
  address_snapshot: Record<string, string>;
  coupon_code: string;
  notes: string;
  admin_notes: string;
  items: OrderItem[];
  status_history: StatusHistory[];
}

export interface CouponValidation {
  code: string;
  discount: string;
  order_value: string;
  message: string;
}

export interface PaymentInitiation {
  payment_id: string;
  order_number: string;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  provider_ref: string;
  initiation: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}