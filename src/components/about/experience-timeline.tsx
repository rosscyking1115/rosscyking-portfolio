import type { ExperienceItem } from "@/types/experience";

interface ExperienceTimelineProps {
  items: readonly ExperienceItem[];
}

export function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const sorted = [...items].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <ol className="mt-8">
      {sorted.map((item, index) => {
        const isLast = index === sorted.length - 1;
        return (
          <li
            key={`${item.organisation}-${item.startDate}`}
            className="relative grid grid-cols-[auto_1fr] gap-x-5 pb-9 last:pb-0"
          >
            <div className="flex flex-col items-center">
              <span className="border-primary bg-background z-10 mt-1 h-2.5 w-2.5 rounded-full border-2" />
              {!isLast && <span className="bg-border mt-1 w-px flex-1" />}
            </div>
            <div>
              <div className="text-muted-foreground font-mono text-xs">{item.period}</div>
              <h3 className="font-display mt-1 text-lg font-semibold">{item.title}</h3>
              <div className="text-muted-foreground text-sm">
                {item.organisation}
                {item.location ? ` · ${item.location}` : null}
                {item.grade ? ` · ${item.grade}` : null}
              </div>
              {item.highlights && item.highlights.length > 0 && (
                <ul className="text-muted-foreground mt-2 space-y-1.5 text-sm leading-relaxed">
                  {item.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
