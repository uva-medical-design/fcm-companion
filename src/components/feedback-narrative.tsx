export function FeedbackNarrative({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());

  // Detect bullet format: lines starting with "- " or "**Category:**"
  const bulletPattern = /^(?:-\s*)?(?:\*\*)?(Strength|Consider|Can't-miss)(?:\*\*)?:\s*/i;
  const isBulletFormat = lines.some((l) => bulletPattern.test(l.trim()));

  if (isBulletFormat) {
    const bullets = lines.filter((l) => bulletPattern.test(l.trim()));
    return (
      <ul className="space-y-3">
        {bullets.map((bullet, i) => {
          const content = bullet.replace(/^-\s*/, "").trim();
          const match = content.match(
            /^(?:\*\*)?(Strength|Consider|Can't-miss)(?:\*\*)?:\s*/i
          );
          if (match) {
            const category = match[1];
            // Strip any remaining markdown bold markers from the rest
            const rest = content.slice(match[0].length).replace(/^\*\*\s*/, "").replace(/\*\*/g, "");
            const colorClass =
              category.toLowerCase() === "strength"
                ? "text-green-700 dark:text-green-400"
                : category.toLowerCase() === "can't-miss"
                ? "text-amber-700 dark:text-amber-400"
                : "text-blue-700 dark:text-blue-400";
            return (
              <li key={i} className="text-sm leading-relaxed">
                <span className={`font-semibold ${colorClass}`}>
                  {category}:
                </span>{" "}
                {rest}
              </li>
            );
          }
          return (
            <li key={i} className="text-sm leading-relaxed">
              {content}
            </li>
          );
        })}
      </ul>
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>;
}
