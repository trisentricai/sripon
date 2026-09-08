export default function AdminProducts() {
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Admin: Products</h1>
    <p>Product CRUD interface will be implemented with tables, forms, and image uploads.</p>
    <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
      <li>Product details: name, SKU, price, MRP, discount</li>
      <li>Variants: size, color, weight, dimensions</li>
      <li>Inventory tracking per variant</li>
      <li>Category & brand relationships</li>
      <li>Cloudinary image uploads</li>
    </ul>
  </div>
}