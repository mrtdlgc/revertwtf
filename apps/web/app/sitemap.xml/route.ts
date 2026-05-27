import { errorSitemapCount, sitemapIndexXml, SITE_URL } from "@/lib/sitemap";

export const runtime = "nodejs";

export function GET(): Response {
  const locations = [`${SITE_URL}/sitemaps/static.xml`];
  for (let i = 0; i < errorSitemapCount(); i += 1) {
    locations.push(`${SITE_URL}/sitemaps/errors-${i}.xml`);
  }

  return new Response(sitemapIndexXml(locations), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
