import type { ExperienceItem } from "@/types/experience";

/**
 * Education timeline shown on the /about page.
 * Sorted by start date desc when rendered.
 */
export const education: readonly ExperienceItem[] = [
  {
    title: "MSc Artificial Intelligence",
    organisation: "University of Sheffield",
    location: "Sheffield, UK",
    period: "Sep 2025 – Sep 2026",
    startDate: "2025-09-01",
    current: true,
    highlights: [
      "Core modules: Scalable ML, NLP, Parallel Computing with GPUs, Machine Learning, Data Science, Text Processing",
      "Focus on applied ML systems, NLP pipelines, scalable computing, and rigorous model evaluation",
    ],
  },
  {
    title: "Pre-Master's, Computing",
    organisation: "University of Sheffield International College",
    location: "Sheffield, UK",
    period: "Jan 2025 – Aug 2025",
    startDate: "2025-01-01",
    grade: "GPA 80",
  },
  {
    title: "BSc Computer Science",
    organisation: "Queen's University Belfast",
    location: "Belfast, UK",
    period: "Sep 2021 – Jun 2024",
    startDate: "2021-09-01",
    highlights: [
      "Data Structures and Algorithms, Software Engineering, Computer Architecture, Cloud Computing",
    ],
  },
] as const;

export const languages = [
  { name: "English", level: "Fluent" },
  { name: "Mandarin", level: "Native" },
  { name: "Japanese", level: "JLPT N1" },
] as const;
