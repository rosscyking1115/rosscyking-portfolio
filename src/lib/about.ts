import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

const ABOUT_FILE = path.join(process.cwd(), "content/about.mdx");

let cache: string | null = null;

export async function getAboutContent(): Promise<string> {
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = await fs.readFile(ABOUT_FILE, "utf8");
  return cache;
}
