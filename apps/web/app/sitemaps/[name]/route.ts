import { errorSitemapCount, errorSitemapUrls, SITE_URL, staticRoutes, urlSetXml } from "@/lib/sitemap";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await params;
  const xml = sitemapFor(name);
  if (!xml) return new Response("not found", { status: 404 });

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

function sitemapFor(name: string): string | null {
  if (name === "static.xml") {
    return urlSetXml(
      staticRoutes.map((route) => ({
        loc: `${SITE_URL}${route.path}`,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
    );
  }

  const match = /^errors-(\d+)\.xml$/.exec(name);
  if (!match) return null;

  const index = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(index) || index < 0 || index >= errorSitemapCount()) return null;

  return urlSetXml(
    errorSitemapUrls(index).map((loc) => ({
      loc,
      changeFrequency: "weekly",
      priority: 0.46,
    })),
  );
}
