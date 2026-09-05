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
  format: { read: "jpg"; thumb: "webp" };
  thumbWidth: number;
  pageList: PageMeta[];
};

/**
 * Per-issue page manifest. Read from the asset bucket when one is configured
 * (NEXT_PUBLIC_ASSET_BASE), otherwise from site/public on disk.
 */
export async function loadManifest(
  slug: string,
): Promise<IssueManifest | null> {
  if (ASSET_BASE) {
    try {
      const res = await fetch(`${ASSET_BASE}/pages/${slug}/manifest.json`, {
        next: { revalidate: 300 },
      });
      if (res.ok) return (await res.json()) as IssueManifest;
    } catch {
      // fall through to local copy
    }
  }
  const file = path.join(process.cwd(), "public", "pages", slug, "manifest.json");
  try {
    const text = await fs.readFile(file, "utf-8");
    return JSON.parse(text) as IssueManifest;
  } catch {
    return null;
  }
}
