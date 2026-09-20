import type { NextConfig } from "next";

const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "*.r2.dev" },
  { protocol: "https", hostname: "assets.reetroz.com" },
  { protocol: "https", hostname: "lh3.googleusercontent.com" },
];
if (assetBase) {
  try {
    const { hostname, protocol } = new URL(assetBase);
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
    });
  } catch {
    // ignore malformed base
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
