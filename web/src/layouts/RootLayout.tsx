import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "../features/auth";
import { CartProvider } from "../features/cart/CartProvider";
import { Header } from "./Header";
import { Footer } from "./Footer";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <ScrollToTop />
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
