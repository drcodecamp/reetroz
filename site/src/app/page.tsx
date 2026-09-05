import { CoverMarquee } from "@/components/CoverMarquee";
import { Eras } from "@/components/Eras";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { ReaderShowcase } from "@/components/ReaderShowcase";
import { StaffPicks } from "@/components/StaffPicks";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CoverMarquee />
        <Features />
        <ReaderShowcase />
        <Eras />
        <StaffPicks />
      </main>
      <Footer />
    </>
  );
}
