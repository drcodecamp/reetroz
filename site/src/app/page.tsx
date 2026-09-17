import type { Metadata } from "next";
import { CoverMarquee } from "@/components/CoverMarquee";
import { Eras } from "@/components/Eras";
import { FeaturedMagazines } from "@/components/FeaturedMagazines";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { ReaderShowcase } from "@/components/ReaderShowcase";
import { StaffPicks } from "@/components/StaffPicks";
import { JsonLd } from "@/components/seo/JsonLd";
import { homeMetadata, SITE_NAME, siteOrigin } from "@/lib/seo";

export const metadata: Metadata = homeMetadata();

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: siteOrigin(),
          description: homeMetadata().description,
        }}
      />
      <Nav />
      <main>
        <Hero />
        <CoverMarquee />
        <FeaturedMagazines />
        <Features />
        <ReaderShowcase />
        <Eras />
        <StaffPicks />
      </main>
      <Footer />
    </>
  );
}
