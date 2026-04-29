import type { Metadata } from "next";

import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Contact",
  description: "Drop a message — I read every one.",
};

export default function ContactPage() {
  return (
    <Section
      size="lg"
      eyebrow="Coming soon"
      heading="Contact"
      description="Drop a message — I read every one. Built in Phase 4."
    />
  );
}
