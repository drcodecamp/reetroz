import { promises as fs } from "node:fs";
import path from "node:path";
import { ASSET_BASE } from "@/lib/assets";

export type PageMeta = { n: number; w: number; h: number; color: string };

export type IssueManifest = {
  id: string;
  slug: string;
  publication: string;
  number: string;
  date: string;
  pages: number;
  format: { read: "jpg" | "webp"; thumb: "webp" };
  thumbWidth: number;
  pageList: PageMeta[];
};

const MANIFEST_CACHE_MAX = 40;
const manifestCache = new Map<string, IssueManifest>();

function remember(slug: string, manifest: IssueManifest) {
  manifestCache.delete(slug);
  manifestCache.set(slug, manifest);
  while (manifestCache.size > MANIFEST_CACHE_MAX) {
    const oldest = manifestCache.keys().next().value;
    if (!oldest) break;
    manifestCache.delete(oldest);
  }
}

/**
 * Per-issue page manifest. Read from the asset bucket when one is configured
 * (NEXT_PUBLIC_ASSET_BASE), otherwise from site/public on disk.
 */
export async function loadManifest(
  slug: string,
): Promise<IssueManifest | null> {
  const cached = manifestCache.get(slug);
  if (cached) {
    remember(slug, cached);
    return cached;
  }

  if (ASSET_BASE) {
    try {
      const res = await fetch(`${ASSET_BASE}/pages/${slug}/manifest.json`, {
        cache: "no-store",
      });
      if (res.ok) {
        const manifest = (await res.json()) as IssueManifest;
        remember(slug, manifest);
        return manifest;
      }
    } catch {
      // fall through to local copy
    }
  }
  const file = path.join(process.cwd(), "public", "pages", slug, "manifest.json");
  try {
    const text = await fs.readFile(file, "utf-8");
    const manifest = JSON.parse(text) as IssueManifest;
    remember(slug, manifest);
    return manifest;
  } catch {
    return null;
  }
}
