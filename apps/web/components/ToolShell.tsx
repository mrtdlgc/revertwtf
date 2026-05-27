export function ToolShell({
  title,
  kicker,
  blurb,
  children,
}: {
  title: string;
  kicker: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lab-page max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8 lab-header p-5 md:p-7">
        <div className="flex flex-wrap gap-2 mb-4">
          <p className="brutal-tag bg-acid">{kicker}</p>
          <p className="brutal-tag bg-cyan">local</p>
        </div>
        <h1 className="font-display text-5xl leading-[0.82] break-words sm:text-6xl md:text-8xl">{title}</h1>
        <p className="mt-4 text-sm max-w-3xl leading-relaxed text-ink/75">{blurb}</p>
      </header>
      <section>
        {children}
      </section>
    </div>
  );
}
