export function FeedbackNarrative({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const isBulletFormat = lines.some((l) => l.trim().startsWith("- "));

  if (isBulletFormat) {
    const bullets = lines.filter((l) => l.trim().startsWith("- "));
    return (
      <ul className="space-y-2">
        {bullets.map((bullet, i) => {
          const content = bullet.replace(/^-\s*/, "");
          const prefixMatch = content.match(
            /^(Strength|Consider|Can't-miss):\s*/i
          );
          if (prefixMatch) {
            return (
              <li key={i} className="text-sm leading-relaxed">
                <span className="font-semibold">{prefixMatch[0]}</span>
                {content.slice(prefixMatch[0].length)}
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

  return <p className="text-sm leading-relaxed">{text}</p>;
}
