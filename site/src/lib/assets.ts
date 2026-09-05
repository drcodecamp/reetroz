/**
 * Where images, manifests and PDFs are served from.
 *
 * Empty (default) = the files in site/public. Set NEXT_PUBLIC_ASSET_BASE to
 * the R2 public URL (or a custom domain in front of it) to serve from the
 * bucket instead. Object keys mirror the public/ layout, so it's a pure
 * prefix swap.
 */
export const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE ?? "").replace(
  /\/+$/,
  "",
);

export function assetUrl(localPath: string): string {
  if (!localPath || !ASSET_BASE) return localPath;
  if (/^https?:\/\//.test(localPath)) return localPath;
  return `${ASSET_BASE}${localPath.startsWith("/") ? "" : "/"}${localPath}`;
}
