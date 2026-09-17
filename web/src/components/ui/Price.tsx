interface PriceProps {
  amount: string | number;
  className?: string;
}

function formatINR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}

export default function Price({ amount, className }: PriceProps) {
  return <span className={className}>{formatINR(amount)}</span>;
}
