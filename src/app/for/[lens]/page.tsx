import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomeView } from "@/components/home/home-view";
import { DEFAULT_LENS, getLens, isLensKey, LENS_KEYS } from "@/lib/lenses";

interface ForLensPageProps {
  params: Promise<{ lens: string }>;
}

// Only the non-default lenses get a /for/<lens> route; `all` lives at `/`.
// dynamicParams = false makes every other segment (including /for/all) 404.
export function generateStaticParams() {
  return LENS_KEYS.filter((lens) => lens !== DEFAULT_LENS).map((lens) => ({ lens }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: ForLensPageProps): Promise<Metadata> {
  const { lens } = await params;
  if (!isLensKey(lens) || lens === DEFAULT_LENS) return {};
  const { label, headline } = getLens(lens);
  return {
    title: label,
    description: headline,
    alternates: { canonical: `/for/${lens}` },
    openGraph: { type: "website", title: label, description: headline },
  };
}

export default async function ForLensPage({ params }: ForLensPageProps) {
  const { lens } = await params;
  if (!isLensKey(lens) || lens === DEFAULT_LENS) notFound();
  return <HomeView lens={lens} />;
}
