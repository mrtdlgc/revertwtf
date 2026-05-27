import { getCatalogStats, listEntryUrls } from "@revertwtf/search";

export const SITE_URL = "https://revert.wtf";
export const ERROR_SITEMAP_CHUNK_SIZE = 5_000;

export interface SitemapRoute {
  path: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

export const staticRoutes: SitemapRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/errors", priority: 0.9, changeFrequency: "daily" },
  { path: "/catalog", priority: 0.85, changeFrequency: "daily" },
  { path: "/tools/revert-decoder", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tools/panic-decoder", priority: 0.74, changeFrequency: "monthly" },
  { path: "/tools/aa-error-decoder", priority: 0.74, changeFrequency: "monthly" },
  { path: "/tools/rpc-error-parser", priority: 0.74, changeFrequency: "monthly" },
  { path: "/tools/selector-resolver", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs", priority: 0.72, changeFrequency: "weekly" },
  { path: "/docs/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs/catalog-format", priority: 0.68, changeFrequency: "monthly" },
  { path: "/docs/contributing", priority: 0.66, changeFrequency: "monthly" },
  { path: "/docs/packages", priority: 0.66, changeFrequency: "monthly" },
  { path: "/docs/mcp", priority: 0.66, changeFrequency: "monthly" },
  { path: "/docs/api", priority: 0.66, changeFrequency: "monthly" },
  { path: "/about", priority: 0.58, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.42, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.42, changeFrequency: "yearly" },
];

export function errorSitemapCount(): number {
  return Math.max(1, Math.ceil(getCatalogStats().total / ERROR_SITEMAP_CHUNK_SIZE));
}

export function errorSitemapUrls(index: number): string[] {
  return listEntryUrls({
    limit: ERROR_SITEMAP_CHUNK_SIZE,
    offset: index * ERROR_SITEMAP_CHUNK_SIZE,
  }).map((entry) => `${SITE_URL}/errors/${encodeURIComponent(entry.id)}`);
}

export function sitemapIndexXml(locations: string[]): string {
  return xmlResponse([
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`),
    "</sitemapindex>",
  ]);
}

export function urlSetXml(urls: Array<{ loc: string; changeFrequency?: string; priority?: number }>): string {
  return xmlResponse([
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => {
      const parts = [`  <url><loc>${escapeXml(url.loc)}</loc>`];
      if (url.changeFrequency) parts.push(`<changefreq>${url.changeFrequency}</changefreq>`);
      if (typeof url.priority === "number") parts.push(`<priority>${url.priority.toFixed(2)}</priority>`);
      parts.push("</url>");
      return parts.join("");
    }),
    "</urlset>",
  ]);
}

export function xmlResponse(lines: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${lines.join("\n")}\n`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
