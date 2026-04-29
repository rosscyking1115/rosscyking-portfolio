export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    label: "Machine learning",
    items: [
      "PyTorch",
      "scikit-learn",
      "Model evaluation",
      "Cross-validation",
      "Hyperparameter tuning",
    ],
  },
  {
    label: "NLP & LLMs",
    items: [
      "Hugging Face Transformers",
      "Qwen / Llama",
      "RAG",
      "Prompt engineering",
      "Event extraction",
      "Document QA",
    ],
  },
  {
    label: "Data & analysis",
    items: ["Python", "pandas", "NumPy", "SQL", "Jupyter", "Statistical analysis"],
  },
  {
    label: "Scalable & systems",
    items: ["PySpark", "Slurm / HPC", "GPU computing", "CUDA", "Docker", "Git"],
  },
  {
    label: "Languages",
    items: ["English", "Mandarin (native)", "Japanese (JLPT N1)"],
  },
] as const;
