export interface ExperienceItem {
  title: string;
  organisation: string;
  location: string;
  /** Display string e.g. "Sep 2025 – Sep 2026". */
  period: string;
  /** Sortable ISO date for ordering (use start date). */
  startDate: string;
  current?: boolean;
  highlights?: readonly string[];
  grade?: string;
}
