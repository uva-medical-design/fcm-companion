import { cn } from "@/lib/utils";

const bulletConfig: Record<
  string,
  { label: string; icon: string; bgClass: string; borderClass: string; labelClass: string }
> = {
  strength: {
    label: "Strength",
    icon: "\u{1F4AA}",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200 dark:border-green-800",
    labelClass: "text-green-700 dark:text-green-400",
  },
  consider: {
    label: "Consider",
    icon: "\u{1F50D}",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-800",
    labelClass: "text-blue-700 dark:text-blue-400",
  },
  "can't-miss": {
    label: "Can't-Miss",
    icon: "\u{1F6A8}",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-800",
    labelClass: "text-red-700 dark:text-red-400",
  },
};

const bulletPattern = /^(?:-\s*)?(?:\*\*)?(Strength|Consider|Can't-miss)(?:\*\*)?:\s*/i;

export function FeedbackNarrative({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const isBulletFormat = lines.some((l) => bulletPattern.test(l.trim()));

  if (isBulletFormat) {
    const bullets = lines.filter((l) => bulletPattern.test(l.trim()));
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold mb-3">Feedback</p>
        {bullets.map((bullet, i) => {
          const content = bullet.replace(/^-\s*/, "").trim();
          const match = content.match(bulletPattern);
          if (!match) return null;
          const category = match[1].toLowerCase();
          const rest = content
            .slice(match[0].length)
            .replace(/^\*\*\s*/, "")
            .replace(/\*\*/g, "");
          const config = bulletConfig[category];
          if (!config) return null;
          return (
            <div
              key={i}
              className={cn(
                "flex gap-2.5 items-start rounded-xl border p-3",
                config.bgClass,
                config.borderClass
              )}
            >
              <span className="text-sm shrink-0 mt-0.5">{config.icon}</span>
              <div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    config.labelClass
                  )}
                >
                  {config.label}
                </span>
                <p className="text-sm text-foreground mt-0.5 leading-relaxed">
                  {rest}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>;
}
