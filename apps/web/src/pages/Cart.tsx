export default function CartPage() {
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Shopping Cart</h1>
    <p>Cart items with quantity controls, variant selection, price calculation, and stock validation.</p>
    <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
      <li>Add/remove items</li>
      <li>Update quantities with stock validation</li>
      <li>Price calculation (never trust frontend totals)</li>
      <li>Discount and coupon integration</li>
    </ul>
  </div>
}