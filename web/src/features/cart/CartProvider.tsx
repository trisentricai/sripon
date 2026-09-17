import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import client from "../../api/client";
import type { ApiResponse } from "../../types/api";
import type { CartItem, CartSummary, CouponValidation } from "../../types/models";
import { useAuth } from "../auth/useAuth";
import { readLocalCart, writeLocalCart, type LocalCartItem } from "./useCartCount";

interface CartContextValue {
  items: CartItem[];
  summary: CartSummary | null;
  loading: boolean;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string, orderValue: number) => Promise<CouponValidation>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function hydrateLocalItem(item: LocalCartItem): CartItem {
  return {
    id: item.productId,
    product: {
      id: item.productId,
      slug: item.slug,
      name: "",
      sku: "",
      unit: "",
      price: "0",
      mrp: "0",
      discount_price: "0",
      effective_price: "0",
      discount_percent: "0",
      available_quantity: 0,
      in_stock: false,
      minimum_order_quantity: 1,
      maximum_order_quantity: 99,
      is_active: true,
      primary_image: null,
    },
    quantity: item.quantity,
    unit_price: "0",
    line_total: "0",
    mrp_line_total: "0",
    tax_total: "0",
    is_available: true,
    added_at: new Date().toISOString(),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadServerCart = useCallback(async () => {
    const response = await client.get<ApiResponse<CartSummary>>("/cart/");
    setSummary(response.data.data);
    setItems(response.data.data.items);
  }, []);

  const loadLocalCart = useCallback(() => {
    const local = readLocalCart();
    setSummary(null);
    setItems(local.map(hydrateLocalItem));
  }, []);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        await loadServerCart();
      } else {
        loadLocalCart();
      }
    } finally {
      setLoading(false);
    }
  }, [user, loadServerCart, loadLocalCart]);

  useEffect(() => {
    refreshCart();
    const handler = () => {
      if (!user) loadLocalCart();
    };
    window.addEventListener("sripon:cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("sripon:cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refreshCart, user, loadLocalCart]);

  const addItem = useCallback(
    async (productId: number, quantity: number) => {
      if (user) {
        await client.post("/cart/items/", { product_id: productId, quantity });
        await loadServerCart();
      } else {
        const local = readLocalCart();
        const existing = local.find((item) => item.productId === productId);
        if (existing) {
          existing.quantity += quantity;
          writeLocalCart(local);
        } else {
          writeLocalCart([...local, { productId, slug: "", quantity }]);
        }
        loadLocalCart();
      }
    },
    [user, loadServerCart, loadLocalCart],
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (user) {
        await client.patch(`/cart/items/${itemId}/`, { quantity });
        await loadServerCart();
      } else {
        const local = readLocalCart().map((item) =>
          item.productId === itemId ? { ...item, quantity } : item,
        );
        writeLocalCart(local);
        loadLocalCart();
      }
    },
    [user, loadServerCart, loadLocalCart],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      if (user) {
        await client.delete(`/cart/items/${itemId}/`);
        await loadServerCart();
      } else {
        const local = readLocalCart().filter((item) => item.productId !== itemId);
        writeLocalCart(local);
        loadLocalCart();
      }
    },
    [user, loadServerCart, loadLocalCart],
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await client.post("/cart/clear/");
      await loadServerCart();
    } else {
      writeLocalCart([]);
      loadLocalCart();
    }
  }, [user, loadServerCart, loadLocalCart]);

  const applyCoupon = useCallback(async (code: string, orderValue: number) => {
    const response = await client.post<ApiResponse<CouponValidation>>("/coupons/validate/", {
      code,
      order_value: orderValue,
    });
    return response.data.data;
  }, []);

  const value = useMemo(
    () => ({
      items,
      summary,
      loading,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      refreshCart,
    }),
    [items, summary, loading, addItem, updateQuantity, removeItem, clearCart, applyCoupon, refreshCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}