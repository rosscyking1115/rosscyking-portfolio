import type { APIRoute } from "astro";

import { pngResponse, renderIcon } from "../lib/og";

/** 180×180 iOS touch icon. Prerendered. */
export const prerender = true;

export const GET: APIRoute = async () => pngResponse(await renderIcon(180));
