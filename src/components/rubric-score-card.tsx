import type { RubricScore } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ratingConfig = {
  excellent: { label: "Excellent", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  good: { label: "Good", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  developing: { label: "Developing", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  needs_work: { label: "Needs Work", className: "bg-muted text-muted-foreground" },
};

export function RubricScoreCard({ score }: { score: RubricScore }) {
  const config = ratingConfig[score.rating];

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{score.category}</span>
        <Badge variant="outline" className={cn("text-[10px] font-medium", config.className)}>
          {config.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {score.comment}
      </p>
    </div>
  );
}
