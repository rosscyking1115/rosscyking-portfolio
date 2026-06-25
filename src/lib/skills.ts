export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    label: "AI Safety & GenAI Evaluation",
    items: [
      "RAG evaluation",
      "LLM evaluation",
      "Red-team testing",
      "Safe refusal evaluation",
      "Guardrail checks",
      "Safety classifier evaluation",
      "Prompt injection testing",
    ],
  },
  {
    label: "AI / ML",
    items: [
      "PyTorch",
      "Hugging Face Transformers",
      "scikit-learn",
      "Model evaluation",
      "Calibration",
      "Structured extraction",
    ],
  },
  {
    label: "Data & Analytics",
    items: [
      "SQL",
      "dbt",
      "DuckDB",
      "BigQuery",
      "pandas",
      "NumPy",
      "A/B testing",
      "CUPED",
      "Synthetic control",
    ],
  },
  {
    label: "Engineering & Delivery",
    items: [
      "Python",
      "FastAPI",
      "Pydantic",
      "Streamlit",
      "Docker",
      "GitHub Actions",
      "CI/CD",
      "Monitoring",
      "OTel-style tracing",
    ],
  },
  {
    label: "Languages",
    items: ["English", "Mandarin Chinese", "Japanese (JLPT N1)"],
  },
] as const;
