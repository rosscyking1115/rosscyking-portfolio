export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    label: "AI Safety & Eval",
    items: [
      "RAG evaluation",
      "LLM evaluation",
      "Prompt engineering",
      "Structured extraction",
      "Red-team testing",
      "Guardrail checks",
      "Hugging Face Transformers",
      "Safe refusal evaluation",
      "Adversarial testing",
      "Safety classifier evaluation",
      "OpenTelemetry / OTel tracing",
    ],
  },
  {
    label: "AI & machine learning",
    items: [
      "PyTorch",
      "scikit-learn",
      "PySpark",
      "Feature engineering",
      "Model evaluation",
      "Calibration",
      "A/B testing & CUPED",
    ],
  },
  {
    label: "Data & cloud",
    items: [
      "dbt",
      "DuckDB",
      "BigQuery",
      "GCP",
      "Cloud Run",
      "Cloud Storage",
      "SQL",
      "PostgreSQL",
    ],
  },
  {
    label: "Engineering",
    items: [
      "Python",
      "FastAPI",
      "Streamlit",
      "Pydantic",
      "Docker",
      "GitHub Actions",
      "Monitoring",
    ],
  },
  {
    label: "Analytics",
    items: [
      "Synthetic control",
      "Causal inference",
      "Customer segmentation",
      "Dashboards",
      "pandas",
      "Statistical analysis",
    ],
  },
  {
    label: "Languages",
    items: ["English (fluent)", "Mandarin (native)", "Japanese (JLPT N1)"],
  },
] as const;
