import Link from "next/link";
import { stats } from "@/lib/catalog";

export function SiteFooter() {
  const s = stats();

  return (
    <footer className="border-t-2 border-paper/20 bg-ink text-paper ink-noise">
      <div className="signal-strip h-2" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 lg:grid-cols-[1.2fr_2fr] text-sm">
        <div>
          <p className="font-display text-5xl text-acid leading-none sm:text-6xl">revert.wtf</p>
          <p className="mt-3 max-w-sm text-bone/75 text-sm leading-relaxed">
            EVM error explanations for products, protocol teams, support
            consoles, and agents.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 max-w-md">
            <FooterMetric value={formatMetric(s.total)} title={s.total.toLocaleString()} label="entries" />
            <FooterMetric value={formatMetric(s.byLayer.protocol ?? 0)} title={(s.byLayer.protocol ?? 0).toLocaleString()} label="protocol" />
            <FooterMetric value={formatMetric(s.byLayer.rpc ?? 0)} title={(s.byLayer.rpc ?? 0).toLocaleString()} label="rpc" />
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <FooterCol title="surface">
            <FooterLink href="/errors">error encyclopedia</FooterLink>
            <FooterLink href="/catalog">catalog table</FooterLink>
            <FooterLink href="/tools/revert-decoder">revert decoder</FooterLink>
            <FooterLink href="/tools/rpc-error-parser">rpc parser</FooterLink>
          </FooterCol>
          <FooterCol title="docs">
            <FooterLink href="/docs">overview</FooterLink>
            <FooterLink href="/docs/how-it-works">how explanations work</FooterLink>
            <FooterLink href="/docs/catalog-format">catalog format</FooterLink>
            <FooterLink href="/docs/packages">packages</FooterLink>
            <FooterLink href="/docs/mcp">MCP and skills</FooterLink>
          </FooterCol>
          <FooterCol title="ship">
            <FooterLink href="/docs/contributing">contributing</FooterLink>
            <FooterLink href="/about">about</FooterLink>
            <FooterLink href="/privacy">privacy</FooterLink>
            <FooterLink href="/terms">terms</FooterLink>
            <FooterLink href="https://github.com/revertwtf/revertwtf" external>github</FooterLink>
            <FooterLink href="https://www.npmjs.com/" external>npm</FooterLink>
          </FooterCol>
        </div>
      </div>
      <div className="border-t border-bone/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-[11px] uppercase tracking-wide2 text-paper/50 flex flex-wrap items-center justify-between gap-2">
          <span>catalog + decoders + MCP + agent skills</span>
          <span>built for protocols willing to explain their errors</span>
        </div>
      </div>
    </footer>
  );
}

function formatMetric(value: number) {
  if (value < 10_000) return value.toLocaleString();
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace("K", "k");
}

function FooterMetric({ value, title, label }: { value: string; title: string; label: string }) {
  return (
    <div className="min-w-0 overflow-hidden border-2 border-bone/70 bg-paper text-ink p-2" title={title}>
      <p className="footer-metric-value font-display">{value}</p>
      <p className="text-[10px] uppercase tracking-wide2">{label}</p>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="brutal-tag bg-acid text-ink mb-3">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        className="hover:text-acid underline underline-offset-4 decoration-2 decoration-bone/30 hover:decoration-acid"
      >
        {children}
      </Link>
    </li>
  );
}
