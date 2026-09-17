interface QtyStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: QtyStepperProps) {
  return (
    <div className="inline-flex items-center rounded-btn border border-ink-soft/20">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex size-9 items-center justify-center text-lg font-bold text-ink-soft transition-colors hover:bg-ink-soft/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        -
      </button>
      <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-ink">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex size-9 items-center justify-center text-lg font-bold text-ink-soft transition-colors hover:bg-ink-soft/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
