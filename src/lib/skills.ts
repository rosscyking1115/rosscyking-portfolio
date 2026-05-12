export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    label: "Data engineering & analytics",
    items: [
      "SQL",
      "dbt",
      "DuckDB",
      "Streamlit",
      "GitHub Actions",
      "Data testing",
      "Analytics engineering",
    ],
  },
  {
    label: "Machine learning",
    items: [
      "PyTorch",
      "scikit-learn",
      "Model evaluation",
      "Cross-validation",
      "Hyperparameter tuning",
      "Feature engineering",
    ],
  },
  {
    label: "NLP & LLMs",
    items: [
      "Hugging Face Transformers",
      "Qwen / Llama",
      "Prompt engineering",
      "Event extraction",
      "Document QA",
      "LLM evaluation",
    ],
  },
  {
    label: "Scalable & systems",
    items: [
      "PySpark",
      "Spark MLlib",
      "Slurm / HPC",
      "Linux",
      "Docker",
      "Git",
      "GPU computing",
    ],
  },
  {
    label: "Data & analysis",
    items: ["Python", "pandas", "NumPy", "Jupyter", "matplotlib", "Statistical analysis"],
  },
  {
    label: "Languages",
    items: ["English", "Mandarin (native)", "Japanese (JLPT N1)"],
  },
] as const;
