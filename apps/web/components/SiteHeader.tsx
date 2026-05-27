import Link from "next/link";
import { stats } from "@/lib/catalog";
import { REPO_URL } from "@/lib/site";

export function SiteHeader() {
  const s = stats();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-paper/20 bg-ink/90 text-paper backdrop-blur">
      <div className="signal-strip h-1" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="group flex max-w-full min-w-0 items-stretch gap-3">
          <span className="grid h-11 w-11 place-items-center border-2 border-paper bg-acid text-ink font-display text-4xl leading-none shadow-[5px_5px_0_#ff3d65]">
            !
          </span>
          <span className="flex min-w-0 flex-col justify-center border-l border-paper/25 pl-3">
            <span className="block truncate font-display text-3xl leading-none text-paper sm:text-4xl">
              revert<span className="text-acid">.</span>wtf
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-wide2 text-paper/50">
              EVM error explanations
            </span>
          </span>
        </Link>

        <nav className="flex w-full flex-wrap items-center gap-1 text-[11px] uppercase tracking-wide2 font-extrabold sm:w-auto sm:text-xs">
          <NavItem href="/errors">errors</NavItem>
          <NavItem href="/tools/revert-decoder">tools</NavItem>
          <NavItem href="/catalog">catalog</NavItem>
          <NavItem href="/docs">docs</NavItem>
          <NavItem href="/about">about</NavItem>
          <ExternalNavItem href={REPO_URL}>source</ExternalNavItem>
          <span className="hidden xl:inline-flex brutal-tag bg-acid ml-2">{s.total.toLocaleString()} entries</span>
        </nav>
      </div>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2.5 py-2 border border-transparent text-paper/75 hover:border-paper hover:bg-paper hover:text-ink transition-colors sm:px-3"
    >
      {children}
    </Link>
  );
}

function ExternalNavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Source repository on GitHub"
      className="px-2.5 py-2 border border-acid bg-acid text-ink hover:border-paper hover:bg-paper transition-colors sm:px-3"
    >
      {children}
    </a>
  );
}
