/** Canonical site URL, shared by layout metadata, robots.ts, sitemap.ts and the OG image. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
  "https://atlastrace-ten.vercel.app";
