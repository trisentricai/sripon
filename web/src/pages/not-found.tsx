import { Link } from "react-router-dom";

export async function loader() {
  return null;
}

export function Component() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="font-display text-7xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        The page you're looking for doesn't exist, may have been moved, or is temporarily unavailable.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary rounded-btn px-6 py-3 text-sm font-semibold">
          Back to Home
        </Link>
        <Link to="/products" className="btn-outline rounded-btn px-6 py-3 text-sm font-semibold">
          Browse Products
        </Link>
      </div>
    </div>
  );
}

export default Component;