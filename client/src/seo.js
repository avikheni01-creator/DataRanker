// Per-route SEO metadata. React 19 hoists <title>/<meta>/<link> rendered here
// into <head>, so each page can declare its own title/description/canonical.
// Static fallbacks for no-JS and social crawlers live in public/index.html
// (a no-SSR SPA can only serve homepage tags to crawlers that don't run JS).

// Canonical/OG absolute base. Set REACT_APP_SITE_URL to the real domain at deploy.
export const SITE_URL = (process.env.REACT_APP_SITE_URL || "https://matrix.example.com").replace(/\/+$/, "");
export const SITE_NAME = "Matrix";

const OG_IMAGE = `${SITE_URL}/logo512.png`;

export default function Seo({ title, description, path = "/", noindex = false, image = OG_IMAGE }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Equity Ranking & Scoring`;
  const url = `${SITE_URL}${path}`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </>
  );
}
