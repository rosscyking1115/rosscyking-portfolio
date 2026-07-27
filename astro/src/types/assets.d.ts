/**
 * Vite resolves an `?inline` asset import to a base64 data URI string.
 * Used for the OG-card fonts in src/lib/og.tsx so the bytes are bundled with
 * the chunk rather than read from a path that moves when the build emits it.
 */
declare module "*.ttf?inline" {
  const dataUri: string;
  export default dataUri;
}
