import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHome } from "../api/products";
import type { HomeSection, ProductListItem, CategoryListItem, BannerListItem } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import ProductCard from "../components/ui/ProductCard";

export async function loader() {
  return null;
}

function HeroSection({ banner }: { banner: BannerListItem }) {
  const bgImage = Object.values(banner.images)[0]?.url;
  const cta = banner.cta;
  let to = "/";
  if (cta.action === "link" && cta.url) to = cta.url;
  else if (cta.action === "product" && cta.product_slug) to = `/products/${cta.product_slug}`;
  else if (cta.action === "category" && cta.category_slug) to = `/category/${cta.category_slug}`;

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      {bgImage && (
        <img
          src={bgImage}
          alt={banner.title}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
      <div className="relative mx-auto flex min-h-[28rem] max-w-7xl flex-col items-start justify-center px-6 py-20 sm:py-28">
        <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
          {banner.title}
        </h1>
        {banner.subtitle && (
          <p className="mt-4 max-w-md text-lg text-white/80">{banner.subtitle}</p>
        )}
        {banner.button_visible && (
          <Link
            to={to}
            className="mt-8 inline-flex items-center gap-2 rounded-btn bg-accent-400 px-7 py-3 text-sm font-bold text-ink shadow-lg transition-colors hover:bg-accent-500"
          >
            {cta.label || "Shop Now"}
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}

function ProductRow({ title, products }: { title: string; products: ProductListItem[] }) {
  if (!products.length) return null;
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <div className="mt-6 flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
          {products.map((p) => (
            <div key={p.id} className="w-52 shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryGrid({ categories }: { categories: CategoryListItem[] }) {
  if (!categories.length) return null;
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display text-2xl font-bold text-ink">Shop by Category</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="card group overflow-hidden transition-shadow hover:shadow-lift"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-soft/5">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-faint text-sm">
                    {cat.name}
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <h3 className="font-display text-sm font-semibold text-ink">{cat.name}</h3>
                {cat.product_count > 0 && (
                  <p className="mt-0.5 text-xs text-ink-faint">{cat.product_count} products</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PosterSection({ banner }: { banner: BannerListItem }) {
  const bgImage = Object.values(banner.images)[0]?.url;
  if (!bgImage) return null;
  return (
    <section className="py-6">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-card">
          <img src={bgImage} alt={banner.title} className="w-full object-cover" loading="lazy" />
          {(banner.title || banner.subtitle) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/40 text-center">
              {banner.title && (
                <h2 className="font-display text-3xl font-bold text-white drop-shadow">{banner.title}</h2>
              )}
              {banner.subtitle && (
                <p className="mt-2 text-lg text-white/90 drop-shadow">{banner.subtitle}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function sectionTitle(type: string): string {
  switch (type) {
    case "BEST_SELLERS": return "Best Sellers";
    case "FEATURED": return "Featured Products";
    case "NEW_ARRIVALS": return "New Arrivals";
    case "OFFERS": return "Offers";
    default: return "Our Collection";
  }
}

export function Component() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getHome();
        if (!cancelled) setSections(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load page");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="mx-auto max-w-7xl px-6 py-10"><ErrorBanner message={error} /></div>;

  return (
    <div>
      {sections.map((section) => {
        switch (section.section_type) {
          case "HERO": {
            const banner = section.payload as BannerListItem;
            return banner ? <HeroSection key={section.id} banner={banner} /> : null;
          }
          case "BEST_SELLERS":
          case "FEATURED":
          case "NEW_ARRIVALS":
          case "OFFERS":
          case "CUSTOM_COLLECTION": {
            const products = (Array.isArray(section.payload) ? section.payload : []) as ProductListItem[];
            return (
              <ProductRow
                key={section.id}
                title={section.title || sectionTitle(section.section_type)}
                products={products}
              />
            );
          }
          case "CATEGORIES": {
            const cats = (Array.isArray(section.payload) ? section.payload : []) as CategoryListItem[];
            return <CategoryGrid key={section.id} categories={cats} />;
          }
          case "PROMOTIONAL_POSTER": {
            const banner = section.payload as BannerListItem;
            return banner ? <PosterSection key={section.id} banner={banner} /> : null;
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
