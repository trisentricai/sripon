export default function CheckoutPage() {
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Checkout</h1>
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h2 className="font-semibold">1. Cart Review</h2>
        <p>Items, variants, quantities.</p>
      </div>
      <div>
        <h2 className="font-semibold">2. Address</h2>
        <p>Shipping and billing addresses.</p>
      </div>
      <div>
        <h2 className="font-semibold">3. Payment</h2>
        <p>Payment method selection.</p>
      </div>
    </div>
    <p>Backend recalculates: product prices, discounts, taxes, shipping, coupon discounts, final amount. Never trust frontend totals.</p>
  </div>
}