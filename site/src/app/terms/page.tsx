import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { SITE_NAME } from "@/lib/seo";

const CONTACT_EMAIL = "info@doctorcode.org";
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
const EFFECTIVE = "20 September 2026";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `${SITE_NAME} does not own the magazines in this archive. Rights holders can request removal at ${CONTACT_EMAIL}.`,
};

const toc = [
  ["what", "What this site is"],
  ["ownership", "We do not own this content"],
  ["affiliation", "No affiliation"],
  ["sources", "Where the scans come from"],
  ["removal", "How to request removal"],
  ["use", "How you may use the site"],
  ["accounts", "Accounts and comments"],
  ["privacy", "Privacy notes"],
  ["disclaimers", "No warranties"],
  ["liability", "Limitation of liability"],
  ["indemnity", "Indemnity"],
  ["changes", "Changes"],
  ["contact", "Contact"],
] as const;

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="pb-24 pt-20">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber">
            Legal · Effective {EFFECTIVE}
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-paper-dim">
            {SITE_NAME} is a fan-made historical archive of video game magazines. We do not own
            those magazines. We do not own the words, photographs, cover art, logos, or
            trademarks in them. We do not sell issues. We do not pretend to be the publisher,
            the editor, the photographer, or the rights holder.
          </p>

          <aside className="mt-8 rounded-2xl border border-amber/30 bg-amber/8 px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber">
              Rights holders
            </p>
            <p className="mt-2 text-base leading-relaxed">
              If you created, published, or otherwise control a magazine on this site and you
              want it taken down, email{" "}
              <a href={CONTACT_MAILTO} className="text-amber underline decoration-amber/40 underline-offset-4 hover:decoration-amber">
                {CONTACT_EMAIL}
              </a>
              . Say which title or issue, and we will remove it. That is the whole process. We
              are not here to fight you for someone else’s work.
            </p>
          </aside>

          <nav aria-label="On this page" className="mt-10 border-t border-paper/8 pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-dim">
              On this page
            </p>
            <ol className="mt-4 columns-1 gap-x-8 sm:columns-2">
              {toc.map(([id, label], i) => (
                <li key={id} className="mb-2 text-sm">
                  <a href={`#${id}`} className="text-paper-dim transition hover:text-paper">
                    <span className="font-mono text-paper-dim/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>{" "}
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-14 space-y-12 text-base leading-relaxed text-paper-dim">
            <Section id="what" title="1. What this site is">
              <p>
                {SITE_NAME} lets people read digitized video game magazines in a browser. The
                project exists to keep old print available for history, research, nostalgia, and
                education. It is not a store. It is not a publisher. It is not an official
                archive of any magazine company.
              </p>
              <p>
                By using the site you agree to these Terms. If you do not agree, do not use the
                site. These Terms are our house rules and disclosures. They are not legal advice,
                and they do not guarantee that nobody will ever object to the archive. We would
                rather be clear than clever.
              </p>
            </Section>

            <Section id="ownership" title="2. We do not own this content">
              <p>
                Every magazine title, issue, article, review, screenshot, advertisement, cover,
                logo, masthead, character likeness, and trade dress on this site remains the
                property of its respective owners — publishers, authors, photographers,
                illustrators, advertisers, and their successors. {SITE_NAME} claims no copyright
                in those works. We do not assign ourselves credit as the creator. We do not
                watermark covers as ours. We do not license the magazines to anyone.
              </p>
              <p>
                Displaying a scan here is not a claim of ownership. Catalog metadata (titles,
                dates, page counts, file paths) is descriptive. The underlying editorial and
                artistic work is not ours.
              </p>
              <p>
                The {SITE_NAME} name, site design, software, and original interface copy are
                separate from the magazines. Those site materials are the only things we speak
                for as our own. Everything that came off a printed page belongs to someone else.
              </p>
            </Section>

            <Section id="affiliation" title="3. No affiliation">
              <p>
                {SITE_NAME} is independent. We are not affiliated with, endorsed by, sponsored
                by, or approved by Nintendo, Ziff Davis, Future, EGM Media, GameStop, Imagine,
                IDG, Prima, BradyGames, official platform magazines, or any other publisher
                whose work appears here. Names and logos appear because they are on the
                historical artifacts. That is identification, not a partnership.
              </p>
              <p>
                Mentions of Video Game History Foundation, Internet Archive, CGW Museum, or other
                libraries describe where scans were found. Those organizations did not ask us to
                build this site and are not responsible for it.
              </p>
            </Section>

            <Section id="sources" title="4. Where the scans come from">
              <p>
                We did not photograph these issues in a warehouse we own. Pages are assembled
                from publicly circulated scans and catalogs: community scanners, the Video Game
                History Foundation library, the Internet Archive, CGW Museum, and similar
                preservation projects. Quality varies. Some issues are incomplete. Some covers
                are the best file we could find, not a studio original.
              </p>
              <p>
                If a credit is wrong or a source should be named differently, tell us. We will
                correct the record. Correcting a credit is not the same as claiming we created
                the magazine.
              </p>
            </Section>

            <Section id="removal" title="5. How to request removal">
              <p>
                We honor good-faith requests from people who have a real connection to the work:
                the publisher, the copyright owner, an author or photographer acting for their
                own contribution, an estate, or a representative who can show they speak for
                one of those parties.
              </p>
              <p>Email {CONTACT_EMAIL} and include, as much as you can:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Your name and the organization you represent, if any.</li>
                <li>The magazine title, issue number, and year — or a link to the page on this site.</li>
                <li>Whether you want the whole title removed or only specific issues.</li>
                <li>A short statement of your relationship to the work (publisher, creator, estate, counsel).</li>
                <li>A way to reach you if we need one clarifying question.</li>
              </ul>
              <p>
                We do not need a lawsuit, a formal demand letter, or a statutory form to start.
                A clear email is enough. We will take down the requested material and stop
                pointing the catalog at it. If only part of an issue is in dispute, say so; we
                will still err toward removal rather than argument.
              </p>
              <p>
                If you are an author or artist and only your piece should come down, say which
                pages or article. We will do what the files allow. If we cannot isolate a
                single page cleanly, we will remove the issue.
              </p>
              <p>
                We may refuse a request that is obviously fraudulent or that asks us to delete
                someone else’s magazine with no connection shown. We will not use that as a
                stalling tactic against a real rights holder.
              </p>
            </Section>

            <Section id="use" title="6. How you may use the site">
              <p>You may browse, read, and share links to pages on {SITE_NAME} for personal, educational, and non-commercial research.</p>
              <p>You may not:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Sell, rent, or bundle the scans as a product.</li>
                <li>Present yourself as the publisher or as {SITE_NAME}’s owner of the magazines.</li>
                <li>Strip credits and rehost the archive as if it were yours.</li>
                <li>Attack, scrape to death, or disrupt the service.</li>
                <li>Use the site to harass living people named in old letters pages or staff boxes.</li>
                <li>Upload malware, scrape account data, or probe the host for access you were not given.</li>
              </ul>
              <p>
                The in-browser reader is for viewing. If you download pages through developer
                tools or a scraper, you do that on your own responsibility. We do not grant you
                a copyright license in the magazines, because we do not have one to give.
              </p>
            </Section>

            <Section id="accounts" title="7. Accounts and comments">
              <p>
                Sign-in is optional. The archive stays readable without an account. If you sign
                in (currently via Google) you may post comments. You are responsible for what
                you write. Do not post illegal content, personal data about other people,
                impersonations, or spam.
              </p>
              <p>
                You keep whatever rights you have in your own comment text. You give {SITE_NAME}
                a non-exclusive permission to display that comment next to the issue. We may
                remove comments that break these rules or the law, or that a rights holder asks
                us to take down.
              </p>
              <p>
                We can close an account that is used to abuse the site. Comments are not
                editorial content of the magazines and should not be read as a statement by any
                publisher.
              </p>
            </Section>

            <Section id="privacy" title="8. Privacy notes">
              <p>
                If you only read, we log the usual technical noise any website sees (IP address,
                browser, pages requested) as part of hosting. We do not sell a list of readers.
              </p>
              <p>
                If you sign in with Google, we receive the name, email, and avatar Google sends
                us so we can attach your comments to a person. We store comments and that
                profile data on the database used by this site. We do not need your date of
                birth, address, or payment card, and we do not ask for them.
              </p>
              <p>
                Accounts are for people who can form this agreement. Do not create an account
                for a child under 13. Old magazines on the shelf may have been sold to younger
                readers; that does not mean we collect information from children.
              </p>
              <p>
                Removal requests and support mail to {CONTACT_EMAIL} are read by the operator
                to act on them. We will not publish your takedown email as a trophy.
              </p>
            </Section>

            <Section id="disclaimers" title="9. No warranties">
              <p>
                The site is provided “as is” and “as available.” Issues go missing. Pages are
                crooked. OCR is wrong. A title may disappear because the rights holder asked.
                We do not warrant that the archive is complete, accurate, uninterrupted, or fit
                for any particular purpose — including citation in a book or use as a substitute
                for buying a legitimate back issue.
              </p>
              <p>
                Historical magazines contain the opinions, ads, and prejudices of their time.
                Hosting a scan is not an endorsement of those opinions, products, or claims.
              </p>
            </Section>

            <Section id="liability" title="10. Limitation of liability">
              <p>
                To the fullest extent the law allows, the operator of {SITE_NAME} is not liable
                for indirect, incidental, special, consequential, or punitive damages, or for
                lost profits, data, or goodwill, arising from your use of the site or from the
                magazines displayed on it.
              </p>
              <p>
                If a court finds us liable anyway, our total liability to you for all claims
                connected to the site will not exceed the amount you paid us to use it in the
                twelve months before the claim — which, today, is zero, because the archive is
                free.
              </p>
              <p>
                Some places do not allow these limits. In those places, the limit is the
                minimum the law requires. Nothing here is meant to exclude liability that
                cannot legally be excluded, including death or personal injury caused by
                negligence where that bar is not allowed.
              </p>
            </Section>

            <Section id="indemnity" title="11. Indemnity">
              <p>
                If your misuse of the site, your comments, or your violation of these Terms
                gets us sued or fined, you will cover the reasonable costs of defending that
                claim — including lawyers’ fees — to the extent the law allows. This does not
                ask a rights holder to indemnify us for hosting their magazine. That risk is
                ours to manage by taking material down when asked.
              </p>
            </Section>

            <Section id="changes" title="12. Changes">
              <p>
                We can update these Terms. The date at the top will change. Continued use after
                a change means you accept the new version. If we make a material change to how
                removal works, we will keep the {CONTACT_EMAIL} address working or put the new
                address on this page.
              </p>
              <p>
                If a court strikes one clause, the rest still applies. These Terms are the
                agreement for use of the site. They do not create a joint venture, employment,
                or license of magazine copyrights.
              </p>
            </Section>

            <Section id="contact" title="13. Contact">
              <p>
                Questions, corrections, and removal requests go to{" "}
                <a href={CONTACT_MAILTO} className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-amber">
                  {CONTACT_EMAIL}
                </a>
                . That inbox is how you reach the person who actually runs this archive.
              </p>
              <p>
                If you are a rights holder: thank you for the magazines. They meant a lot to
                the people who bought them new, and they still do. If you want them off this
                site, say so. We will listen.
              </p>
            </Section>
          </div>

          <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim/70">
            Last updated {EFFECTIVE} · {SITE_NAME}
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-bold tracking-tight text-paper">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
