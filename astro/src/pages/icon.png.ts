import type { APIRoute } from "astro";

import { pngResponse, renderIcon } from "../lib/og";

/**
 * 512×512 site icon — browsers downscale for tab favicons.
 * Prerendered, where Next generated it per request.
 */
export const prerender = true;

export const GET: APIRoute = async () => pngResponse(await renderIcon(512));
