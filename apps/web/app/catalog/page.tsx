import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { catalogShards, listEntries, sourceLabel, sourceStatus } from "@/lib/catalog";

const PAGE_SIZE = 100;
const DESCRIPTION =
  "Browse the machine-readable revert.wtf catalog by shard, source, layer, category, and confidence.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; shard?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = Boolean(params.page || params.shard);

  return {
    title: "Error catalog - revert.wtf",
    description: DESCRIPTION,
    alternates: { canonical: "/catalog" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Error catalog - revert.wtf",
      description: DESCRIPTION,
      url: "/catalog",
      type: "website",
    },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; shard?: string }>;
}) {
  const params = await searchParams;
  const shards = catalogShards();
  const selectedShard = params.shard ? shards.find((shard) => shard.id === params.shard) : undefined;
  const requestedPage = parsePage(params.page);
  let currentPage = requestedPage;
  let startIndex = (currentPage - 1) * PAGE_SIZE;
  let result = listEntries({
    shardId: selectedShard?.id,
    limit: PAGE_SIZE,
    offset: startIndex,
  });
  const totalEntries = result.totalMatches;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  currentPage = Math.min(requestedPage, totalPages);
  if (currentPage !== requestedPage) {
    startIndex = (currentPage - 1) * PAGE_SIZE;
    result = listEntries({
      shardId: selectedShard?.id,
      limit: PAGE_SIZE,
      offset: startIndex,
    });
  }
  const pageEntries = result.entries;
  const firstShown = totalEntries === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + PAGE_SIZE, totalEntries);
  const jsonLd = catalogJsonLd({
    totalEntries,
    shardId: selectedShard?.id,
    entries: pageEntries.slice(0, 20),
  });

  return (
    <div className="lab-page max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={jsonLd} />
      <header className="mb-8 lab-header p-5 md:p-7">
        <p className="brutal-tag bg-acid">/catalog</p>
        <h1 className="font-display text-5xl leading-[0.82] mt-4 break-words sm:text-6xl md:text-8xl">raw signal table</h1>
        <p className="mt-4 text-sm max-w-2xl text-ink/75">
          A shard-level view of the open catalog powering the website, API, packages, MCP server, and agent skill files.
        </p>
      </header>

      <section className="mb-6 brutal-card-flat bg-paper p-4" aria-label="About the machine-readable catalog">
        <h2 className="text-sm font-black uppercase tracking-wide2">Canonical catalog surface</h2>
        <p className="mt-2 max-w-4xl text-sm text-ink/70">
          Use this page to inspect coverage, sources, lifecycle labels, and shard boundaries. Use the error encyclopedia for
          human-readable pages with causes and next steps.
        </p>
      </section>

      <ShardBrowser shards={shards} selectedShard={selectedShard} />

      <CatalogPager
        currentPage={currentPage}
        totalPages={totalPages}
        firstShown={firstShown}
        lastShown={lastShown}
        totalEntries={totalEntries}
        shardId={selectedShard?.id}
      />

      <div className="overflow-x-auto brutal-card-flat bg-chalk paper-texture">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide2">
            <tr>
              <th className="text-left p-3">id</th>
              <th className="text-left p-3">title</th>
              <th className="text-left p-3">source</th>
              <th className="text-left p-3">layer</th>
              <th className="text-left p-3">category</th>
              <th className="text-left p-3">conf</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((e) => (
              <tr key={e.id} className="border-t-2 border-ink/10 hover:bg-acid/35">
                <td className="p-3 font-mono text-xs min-w-[260px]">
                  <Link href={`/errors/${e.id}`} className="brutal-link">{e.id}</Link>
                </td>
                <td className="p-3 min-w-[260px]">{e.title}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5 min-w-[180px]">
                    <span className="brutal-tag bg-paper">{sourceLabel(e)}</span>
                    {sourceStatus(e) && <span className="brutal-tag bg-blood text-paper">{sourceStatus(e)}</span>}
                  </div>
                </td>
                <td className="p-3">{e.layer}</td>
                <td className="p-3">{e.category}</td>
                <td className="p-3">{e.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CatalogPager
        currentPage={currentPage}
        totalPages={totalPages}
        firstShown={firstShown}
        lastShown={lastShown}
        totalEntries={totalEntries}
        shardId={selectedShard?.id}
        compact
      />
    </div>
  );
}

function catalogJsonLd({
  totalEntries,
  shardId,
  entries,
}: {
  totalEntries: number;
  shardId?: string;
  entries: Array<{ id: string; title: string; summary: string }>;
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: shardId ? `revert.wtf error catalog shard: ${shardId}` : "revert.wtf error catalog",
      description: DESCRIPTION,
      url: "https://revert.wtf/catalog",
      isAccessibleForFree: true,
      license: "https://opensource.org/license/mit",
      creator: {
        "@type": "Organization",
        name: "revert.wtf",
        url: "https://revert.wtf",
      },
      keywords: ["EVM errors", "revert reasons", "RPC errors", "wallet errors", "ERC-4337", "x402"],
      size: totalEntries,
      distribution: {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: "https://github.com/mrtdlgc/revertwtf/tree/main/packages/catalog/src/data/shards",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: shardId ? `Catalog entries in ${shardId}` : "Catalog entries",
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://revert.wtf/errors/${encodeURIComponent(entry.id)}`,
        name: entry.title,
        description: entry.summary,
      })),
    },
  ];
}

function parsePage(rawPage: string | undefined) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(parsed, 1);
}

function catalogPageHref(page: number, shardId?: string) {
  const params = new URLSearchParams();
  if (shardId) params.set("shard", shardId);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
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

function CatalogPager({
  currentPage,
  totalPages,
  firstShown,
  lastShown,
  totalEntries,
  shardId,
  compact = false,
}: {
  currentPage: number;
  totalPages: number;
  firstShown: number;
  lastShown: number;
  totalEntries: number;
  shardId?: string;
  compact?: boolean;
}) {
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;
  const pages = paginationItems(currentPage, totalPages);

  return (
    <nav
      className={`brutal-card-flat bg-bone paper-texture ${compact ? "mt-4 p-3" : "mb-4 p-3"} flex flex-wrap items-center justify-between gap-3`}
      aria-label="Catalog pagination"
    >
      <p className="min-w-0 text-xs font-extrabold uppercase tracking-wide2 text-ink/65">
        showing {firstShown.toLocaleString()}-{lastShown.toLocaleString()} of {totalEntries.toLocaleString()} / page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
        {shardId && <span> / shard {shardId}</span>}
      </p>

      <div className="flex max-w-full flex-wrap items-center gap-2">
        {canGoBack ? (
          <Link href={catalogPageHref(currentPage - 1, shardId)} className="brutal-button-ghost bg-paper">
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
                href={catalogPageHref(item, shardId)}
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
          <Link href={catalogPageHref(currentPage + 1, shardId)} className="brutal-button-ghost bg-paper">
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

function ShardBrowser({
  shards,
  selectedShard,
}: {
  shards: ReturnType<typeof catalogShards>;
  selectedShard: ReturnType<typeof catalogShards>[number] | undefined;
}) {
  const groups = groupShards(shards);

  return (
    <section className="brutal-card-flat bg-chalk paper-texture mb-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="brutal-tag bg-acid">shard browser</p>
          <p className="mt-2 text-xs uppercase tracking-wide2 text-ink/60">
            {selectedShard
              ? `${selectedShard.id} / ${selectedShard.count.toLocaleString()} entries`
              : `${shards.length.toLocaleString()} shards / all catalog entries`}
          </p>
        </div>

        <form className="flex max-w-full flex-wrap items-center gap-2" action="/catalog">
          <label className="sr-only" htmlFor="catalog-shard">catalog shard</label>
          <select
            id="catalog-shard"
            name="shard"
            defaultValue={selectedShard?.id ?? ""}
            className="brutal-input min-w-[220px] max-w-full bg-paper py-2 text-xs"
          >
            <option value="">all shards</option>
            {groups.map(([group, groupShards]) => (
              <optgroup key={group} label={group}>
                {groupShards.map((shard) => (
                  <option key={shard.id} value={shard.id}>
                    {shard.name} ({shard.count.toLocaleString()})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="submit" className="brutal-button bg-ink text-acid">
            open
          </button>
          {selectedShard && (
            <Link href="/catalog" className="brutal-button-ghost bg-paper">
              all
            </Link>
          )}
        </form>
      </div>
    </section>
  );
}

function groupShards(shards: ReturnType<typeof catalogShards>) {
  const groups = new Map<string, typeof shards>();
  for (const shard of shards) {
    const group = groups.get(shard.group) ?? [];
    group.push(shard);
    groups.set(shard.group, group);
  }
  return Array.from(groups.entries());
}
