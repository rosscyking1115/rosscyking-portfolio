export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    label: "Data Engineering",
    items: [
      "PySpark",
      "dbt",
      "DuckDB",
      "Snowflake",
      "Dagster",
      "SQL",
      "Parquet",
      "BigQuery",
      "Data testing",
    ],
  },
  {
    label: "ML Engineering",
    items: [
      "scikit-learn",
      "LightGBM",
      "PyTorch",
      "MLflow",
      "Model evaluation",
      "Calibration",
      "Backtesting",
      "Drift monitoring",
    ],
  },
  {
    label: "AI Safety & Evaluation",
    items: [
      "LLM evaluation",
      "RAG evaluation",
      "Red-team testing",
      "Safe refusal evaluation",
      "Guardrail checks",
      "Prompt injection testing",
      "Inspect AI",
    ],
  },
  {
    label: "Engineering & Delivery",
    items: [
      "Python",
      "FastAPI",
      "Pydantic",
      "TypeScript",
      "Next.js",
      "Streamlit",
      "Docker",
      "GitHub Actions",
      "CI/CD",
    ],
  },
  {
    label: "Languages",
    items: ["English", "Mandarin Chinese", "Japanese (JLPT N1)"],
  },
] as const;
