import { assetUrl } from "@/lib/assets";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

/**
 * Catalog covers are already 600px JPEGs on R2. A plain img keeps Next from
 * downloading every cover during `next build` prerender (that is what killed
 * /magazines/egm2 on Render).
 */
export function CoverImage({
  src,
  alt,
  fill,
  sizes,
  priority,
  className = "",
  ...rest
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(src)}
      alt={alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
      {...rest}
    />
  );
}
