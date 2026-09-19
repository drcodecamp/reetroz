import Image, { type ImageProps } from "next/image";
import { assetUrl } from "@/lib/assets";

/**
 * Catalog covers are already 600px JPEGs on R2. next/image would proxy them
 * through /_next/image (re-encode at q=75, burn app-server CPU). Serve the
 * object URL as-is instead.
 */
export function CoverImage({ src, alt, ...props }: ImageProps) {
  const resolved = typeof src === "string" ? assetUrl(src) : src;
  return <Image {...props} src={resolved} alt={alt} unoptimized />;
}
