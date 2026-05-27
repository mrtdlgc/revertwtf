import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { categories, layers, listEntries, sourceLabel, sourceStatus } from "@/lib/catalog";

const PAGE_SIZE = 60;
const DESCRIPTION =
  "Browse EVM, RPC, wallet, UserOperation, protocol, and x402 errors with likely causes, evidence, and next steps.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string; category?: string; q?: string; page?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = Boolean(params.layer || params.category || params.q || params.page);

  return {
    title: "EVM error encyclopedia - revert.wtf",
    description: DESCRIPTION,
    alternates: { canonical: "/errors" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "EVM error encyclopedia - revert.wtf",
      description: DESCRIPTION,
      url: "/errors",
      type: "website",
    },
  };
}

export default async function ErrorsIndex({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string; category?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filters = { layer: params.layer, category: params.category, q: params.q };
  const requestedPage = parsePage(params.page);
  let currentPage = requestedPage;
  let startIndex = (currentPage - 1) * PAGE_SIZE;
  let result = listEntries({
    query: params.q,
    layer: params.layer,
    category: params.category,
    limit: PAGE_SIZE,
    offset: startIndex,
  });
  const totalEntries = result.totalMatches;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  currentPage = Math.min(requestedPage, totalPages);
  if (currentPage !== requestedPage) {
    startIndex = (currentPage - 1) * PAGE_SIZE;
    result = listEntries({
      query: params.q,
      layer: params.layer,
      category: params.category,
      limit: PAGE_SIZE,
      offset: startIndex,
    });
  }
  const pageEntries = result.entries;
  const firstShown = totalEntries === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + PAGE_SIZE, totalEntries);
  const jsonLd = errorsIndexJsonLd(pageEntries.slice(0, 20));

  return (
    <div className="lab-page max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={jsonLd} />
      <header className="mb-8 lab-header p-5 md:p-7">
        <p className="brutal-tag bg-acid">/errors</p>
        <h1 className="font-display text-5xl leading-[0.82] mt-4 break-words sm:text-6xl md:text-8xl">error encyclopedia</h1>
        <p className="mt-4 text-sm max-w-2xl text-ink/75">
          Browse error pages built for people debugging EVM products: what the error usually means,
          what evidence supports the match, and what to try next.
        </p>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3" aria-label="About the error encyclopedia">
        <div className="brutal-card-flat bg-paper p-4">
          <h2 className="text-sm font-black uppercase tracking-wide2">Human meaning</h2>
          <p className="mt-2 text-sm text-ink/70">
            Entries translate provider messages, revert reasons, selectors, panic codes, AA errors, and protocol-specific failures into readable explanations.
          </p>
        </div>
        <div className="brutal-card-flat bg-paper p-4">
          <h2 className="text-sm font-black uppercase tracking-wide2">Actionable checks</h2>
          <p className="mt-2 text-sm text-ink/70">
            Each page separates likely causes from next steps so wallets, explorers, agents, and support tools can show useful guidance.
          </p>
        </div>
        <div className="brutal-card-flat bg-paper p-4">
          <h2 className="text-sm font-black uppercase tracking-wide2">Catalog-backed</h2>
          <p className="mt-2 text-sm text-ink/70">
            The encyclopedia is powered by the same open catalog used by the public API, npm packages, MCP server, and agent skill files.
          </p>
        </div>
      </section>

      <form className="brutal-card-flat p-3 bg-bone mb-6 grid lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] gap-2 items-center paper-texture">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="search id, title, source, summary"
          className="brutal-input min-w-0"
        />
        <select name="layer" defaultValue={params.layer ?? ""} className="brutal-input min-w-0">
          <option value="">all layers</option>
          {layers().map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select name="category" defaultValue={params.category ?? ""} className="brutal-input min-w-0">
          <option value="">all categories</option>
          {categories().map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="brutal-button">apply</button>
      </form>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <p className="brutal-tag bg-acid">{totalEntries.toLocaleString()} entries</p>
        {params.q && <p className="brutal-tag bg-paper">q: {params.q}</p>}
        {params.layer && <p className="brutal-tag bg-paper">layer: {params.layer}</p>}
        {params.category && <p className="brutal-tag bg-paper">category: {params.category}</p>}
      </div>

      <ErrorsPager
        currentPage={currentPage}
        totalPages={totalPages}
        firstShown={firstShown}
        lastShown={lastShown}
        totalEntries={totalEntries}
        filters={filters}
      />

      <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pageEntries.map((e) => (
          <li key={e.id}>
            <Link href={`/errors/${e.id}`} className="slab-link brutal-card-flat bg-chalk p-4 block hover:bg-paper group h-full">
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="brutal-tag bg-paper">{sourceLabel(e)}</span>
                {sourceStatus(e) && <span className="brutal-tag bg-blood text-paper">{sourceStatus(e)}</span>}
                <span className="brutal-tag">{e.layer.replace(/_/g, " ")}</span>
                <span className="brutal-tag bg-bone">conf: {e.confidence}</span>
              </div>
              <p className="font-extrabold text-lg leading-tight">{e.title}</p>
              <p className="mt-2 text-sm text-ink/75 line-clamp-3">{e.summary}</p>
              <p className="mt-4 font-mono text-[11px] text-ink/55 break-all">{e.id} -&gt;</p>
            </Link>
          </li>
        ))}
      </ul>
      {totalEntries === 0 && (
        <p className="brutal-card-flat p-6 text-center bg-chalk">no matches.</p>
      )}

      {totalEntries > 0 && (
        <ErrorsPager
          currentPage={currentPage}
          totalPages={totalPages}
          firstShown={firstShown}
          lastShown={lastShown}
          totalEntries={totalEntries}
          filters={filters}
          compact
        />
      )}
    </div>
  );
}

function errorsIndexJsonLd(entries: Array<{ id: string; title: string; summary: string }>) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "EVM error encyclopedia",
      description: DESCRIPTION,
      url: "https://revert.wtf/errors",
      isPartOf: {
        "@type": "WebSite",
        name: "revert.wtf",
        url: "https://revert.wtf",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://revert.wtf/errors?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: entries.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `https://revert.wtf/errors/${encodeURIComponent(entry.id)}`,
          name: entry.title,
          description: entry.summary,
        })),
      },
    },
    breadcrumbJsonLd([{ name: "Errors", url: "https://revert.wtf/errors" }]),
  ];
}

function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://revert.wtf" },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: item.url,
      })),
    ],
  };
}

function parsePage(rawPage: string | undefined) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(parsed, 1);
}

function errorsPageHref(
  page: number,
  filters: { layer?: string; category?: string; q?: string },
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.layer) params.set("layer", filters.layer);
  if (filters.category) params.set("category", filters.category);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/errors?${query}` : "/errors";
}

function paginationItems(currentPage: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalized = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "gap"> = [];
  for (const page of normalized) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      items.push("gap");
    }
    items.push(page);
  }
  return items;
}

function ErrorsPager({
  currentPage,
  totalPages,
  firstShown,
  lastShown,
  totalEntries,
  filters,
  compact = false,
}: {
  currentPage: number;
  totalPages: number;
  firstShown: number;
  lastShown: number;
  totalEntries: number;
  filters: { layer?: string; category?: string; q?: string };
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;

  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;
  const pages = paginationItems(currentPage, totalPages);

  return (
    <nav
      className={`brutal-card-flat bg-bone paper-texture ${compact ? "mt-5 p-3" : "mb-5 p-3"} flex flex-wrap items-center justify-between gap-3`}
      aria-label="Error pagination"
    >
      <p className="min-w-0 text-xs font-extrabold uppercase tracking-wide2 text-ink/65">
        showing {firstShown.toLocaleString()}-{lastShown.toLocaleString()} of {totalEntries.toLocaleString()} / page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
      </p>

      <div className="flex max-w-full flex-wrap items-center gap-2">
        {canGoBack ? (
          <Link href={errorsPageHref(currentPage - 1, filters)} className="brutal-button-ghost bg-paper">
            prev
          </Link>
        ) : (
          <span className="brutal-button-ghost bg-paper opacity-45" aria-disabled="true">
            prev
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {pages.map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-2 font-extrabold text-ink/45" aria-hidden>
                ...
              </span>
            ) : (
              <Link
                key={item}
                href={errorsPageHref(item, filters)}
                className={`grid h-9 min-w-9 place-items-center border-2 border-ink px-2 text-xs font-black ${
                  item === currentPage ? "bg-ink text-acid" : "bg-paper text-ink hover:bg-acid"
                }`}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </Link>
            ),
          )}
        </div>

        {canGoForward ? (
          <Link href={errorsPageHref(currentPage + 1, filters)} className="brutal-button-ghost bg-paper">
            next
          </Link>
        ) : (
          <span className="brutal-button-ghost bg-paper opacity-45" aria-disabled="true">
            next
          </span>
        )}
      </div>
    </nav>
  );
}
