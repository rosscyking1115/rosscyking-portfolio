import { HomeView } from "@/components/home/home-view";
import { DEFAULT_LENS, isLensKey } from "@/lib/lenses";

interface HomeProps {
  searchParams: Promise<{ lens?: string }>;
}

/**
 * `?lens=<role>` sets the initial featured lens (for shareable/bookmarked
 * links); an unknown or missing value falls back to the default. Switching
 * after load happens in place on the client.
 */
export default async function Home({ searchParams }: HomeProps) {
  const { lens } = await searchParams;
  const initialLens = lens && isLensKey(lens) ? lens : DEFAULT_LENS;
  return <HomeView lens={initialLens} />;
}
