import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export function InstructionBanner({
  children,
  className,
  icon = true,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/20",
        className
      )}
    >
      <div className="flex gap-2">
        {icon && (
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        )}
        <div className="text-sm text-blue-800 dark:text-blue-200">
          {children}
        </div>
      </div>
    </div>
  );
}
