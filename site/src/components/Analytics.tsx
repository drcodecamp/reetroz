import Script from "next/script";

const DEFAULT_GA_ID = "G-20LNGBJM6C";

function gaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_ID;
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return null;
  return id;
}

export function Analytics() {
  const gaId = gaMeasurementId();
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');
`}
      </Script>
    </>
  );
}
