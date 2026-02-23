import { cn } from "@/lib/utils";

export function ConfidenceRating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">How likely?</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Likelihood ${n} of 5`}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
            value === n
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
