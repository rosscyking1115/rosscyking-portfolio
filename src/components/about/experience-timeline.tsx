import { Badge } from "@/components/ui/badge";
import type { ExperienceItem } from "@/types/experience";

interface ExperienceTimelineProps {
  items: readonly ExperienceItem[];
}

export function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const sorted = [...items].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <ol className="space-y-8">
      {sorted.map((item) => (
        <li
          key={`${item.organisation}-${item.startDate}`}
          className="border-border border-l-2 pl-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{item.title}</h3>
            {item.current && (
              <Badge variant="default" className="text-[10px]">
                Current
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {item.organisation} · {item.location}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {item.period}
            {item.grade ? ` · ${item.grade}` : null}
          </p>
          {item.highlights && item.highlights.length > 0 && (
            <ul className="text-muted-foreground marker:text-muted-foreground/60 mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed">
              {item.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
