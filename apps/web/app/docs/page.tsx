import Link from "next/link";

export const metadata = { title: "docs - revert.wtf" };

const DOCS = [
  { href: "/docs/how-it-works", title: "how explanations work", blurb: "How revert.wtf turns raw errors into likely causes, evidence, and next steps." },
  { href: "/docs/catalog-format", title: "catalog format", blurb: "Schema, pattern types, source labels, lifecycle notes, and references." },
  { href: "/docs/contributing", title: "contributing errors", blurb: "How to add one sharp catalog entry with fixtures and references." },
  { href: "/docs/packages", title: "packages", blurb: "Core, catalog, parser, selectors, AA, search, CLI, and web boundaries." },
  { href: "/docs/mcp", title: "MCP and agent skills", blurb: "Tools, resources, and repo skill files agents can use when they hit EVM errors." },
  { href: "/docs/api", title: "public API", blurb: "Hosted HTTP routes and the tiny client SDK for browser-safe integrations." },
];

export default function Docs() {
  return (
    <div className="lab-page max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8 lab-header p-5 md:p-7">
        <p className="brutal-tag bg-acid">/docs</p>
        <h1 className="font-display text-5xl leading-[0.85] mt-4 break-words sm:text-6xl md:text-8xl">docs</h1>
      </header>
      <ul className="grid sm:grid-cols-2 gap-4">
        {DOCS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="slab-link brutal-card-flat bg-chalk p-5 block hover:bg-paper h-full">
              <p className="font-extrabold text-xl leading-none">{d.title}</p>
              <p className="text-sm mt-3 text-ink/75">{d.blurb}</p>
              <p className="text-xs font-mono mt-4 text-ink/55 break-all">{d.href} -&gt;</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
