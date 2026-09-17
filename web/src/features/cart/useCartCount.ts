import { useEffect, useState } from "react";

const CART_KEY = "sripon.cart";
const CART_EVENT = "sripon:cart-updated";

export interface LocalCartItem {
  productId: number;
  slug: string;
  quantity: number;
}

/** Read the guest cart from localStorage (server cart arrives in Phase 6). */
export function readLocalCart(): LocalCartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalCartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: items }));
}

/** Subscribes a React component to the local cart so the header badge stays in sync. */
export function useCartCount(): number {
  const [count, setCount] = useState(() =>
    readLocalCart().reduce((sum, item) => sum + item.quantity, 0),
  );

  useEffect(() => {
    const handler = () =>
      setCount(readLocalCart().reduce((sum, item) => sum + item.quantity, 0));
    window.addEventListener(CART_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CART_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return count;
}