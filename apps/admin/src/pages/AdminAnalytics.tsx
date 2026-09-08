export default function AdminAnalytics() {
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Admin Analytics</h1>
    <div className="grid gap-4 md:grid-cols-4">
      <div className="p-4 border rounded-lg bg-card"><h3 className="font-semibold">Revenue</h3><p>Gross / Net / Refunds</p></div>
      <div className="p-4 border rounded-lg bg-card"><h3 className="font-semibold">Orders</h3><p>Completed / Cancelled / Returned</p></div>
      <div className="p-4 border rounded-lg bg-card"><h3 className="font-semibold">Customers</h3><p>New / Returning / Active</p></div>
      <div className="p-4 border rounded-lg bg-card"><h3 className="font-semibold">Products</h3><p>Best / Low / Out of Stock</p></div>
    </div>
    <p>Conversion funnel tracking: Product View → Add to Cart → Checkout → Payment → Purchase</p>
  </div>
}