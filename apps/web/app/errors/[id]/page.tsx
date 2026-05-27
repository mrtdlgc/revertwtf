import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CatalogEntry } from "@revertwtf/catalog";
import { JsonLd } from "@/components/JsonLd";
import { entryById, sourceLabel, sourceStatus } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = entryById(id);
  if (!e) return {};
  const canonical = `/errors/${encodeURIComponent(e.id)}`;

  return {
    title: `${e.title} - revert.wtf`,
    description: e.summary,
    alternates: { canonical },
    openGraph: {
      title: `${e.title} - revert.wtf`,
      description: e.summary,
      url: canonical,
      type: "article",
    },
  };
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = entryById(id);
  if (!e) return notFound();
  const jsonLd = entryJsonLd(e);

  return (
    <article className="lab-page max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={jsonLd} />
      <Link href="/errors" className="brutal-tag bg-paper">&lt;- all errors</Link>

      <header className="mt-6 lab-header p-5 md:p-7">
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="brutal-tag bg-acid">{sourceLabel(e)}</span>
          {sourceStatus(e) && <span className="brutal-tag bg-blood text-paper">{sourceStatus(e)}</span>}
          <span className="brutal-tag bg-cyan">{e.layer.replace(/_/g, " ")}</span>
          <span className="brutal-tag">{e.category.replace(/_/g, " ")}</span>
          <span className="brutal-tag bg-bone">conf: {e.confidence}</span>
        </div>
        <h1 className="font-display text-4xl leading-[0.9] break-words sm:text-5xl md:text-8xl md:leading-[0.85]">{e.title}</h1>
        <p className="mt-5 text-lg max-w-3xl leading-relaxed text-ink/75">{e.summary}</p>
        {e.sourceNote && (
          <p className="mt-3 max-w-3xl text-sm font-bold text-ink/70">{e.sourceNote}</p>
        )}
        <p className="mt-4 font-mono text-xs break-all text-ink/55">{e.id}</p>
      </header>

      <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
        <Panel title="likely causes">
          <ul className="space-y-3">
            {e.likelyCauses.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 border border-ink bg-blood" aria-hidden />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="advice" tone="bg-bone paper-texture">
          <dl className="space-y-3 text-sm">
            <Row k="retry" v={e.retryHelpful} />
            <Row k="gas" v={e.increasingGasHelpful} />
            <Row k="root cause" v={e.rootCauseKnown ? "known" : "unknown"} />
          </dl>
        </Panel>
      </div>

      <Panel title="next steps" className="mt-6">
        <ol className="space-y-3 list-decimal list-inside marker:font-display marker:text-blood marker:text-xl">
          {e.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </Panel>

      <Panel title="matcher rule preview" className="mt-6" tone="bg-chalk">
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({ patterns: e.patterns, requires: e.requires ?? [] }, null, 2)}
        </pre>
      </Panel>

      {e.references && e.references.length > 0 && (
        <Panel title="references" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {e.references.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noreferrer" className="brutal-button-ghost">{r.label}</a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {e.related && e.related.length > 0 && (
        <Panel title="related" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {e.related.map((relatedId) => (
              <li key={relatedId}>
                <Link href={`/errors/${relatedId}`} className="brutal-tag bg-acid hover:bg-ink hover:text-acid">{relatedId}</Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </article>
  );
}

function Panel({
  title,
  tone = "bg-paper",
  className = "",
  children,
}: {
  title: string;
  tone?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`brutal-card-flat p-5 ${tone} ${className}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide2 text-ink/60 mb-3">{title}</p>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-xs uppercase tracking-wide2">{k}</dt>
      <dd><span className="brutal-tag bg-paper">{v}</span></dd>
    </div>
  );
}

function entryJsonLd(entry: CatalogEntry) {
  const canonical = `https://revert.wtf/errors/${encodeURIComponent(entry.id)}`;
  const references = entry.references?.map((reference) => reference.url) ?? [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: entry.title,
      description: entry.summary,
      url: canonical,
      mainEntityOfPage: canonical,
      isAccessibleForFree: true,
      inLanguage: "en",
      articleSection: [entry.layer, entry.category],
      keywords: [
        entry.id,
        entry.source,
        entry.sourceDisplayName,
        entry.layer,
        entry.category,
        "EVM error",
        "revert reason",
      ].filter(Boolean),
      about: {
        "@type": "DefinedTerm",
        name: entry.title,
        termCode: entry.id,
        description: entry.summary,
        inDefinedTermSet: "https://revert.wtf/errors",
      },
      publisher: {
        "@type": "Organization",
        name: "revert.wtf",
        url: "https://revert.wtf",
      },
      citation: references.length ? references : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://revert.wtf" },
        { "@type": "ListItem", position: 2, name: "Errors", item: "https://revert.wtf/errors" },
        { "@type": "ListItem", position: 3, name: entry.title, item: canonical },
      ],
    },
  ];
}
