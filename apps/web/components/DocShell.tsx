export function DocShell({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <article className="lab-page max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <header className="lab-header p-5 md:p-7 mb-8">
        <p className="brutal-tag bg-acid">{kicker}</p>
        <h1 className="font-display text-5xl leading-[0.85] mt-4 break-words sm:text-6xl md:text-8xl">{title}</h1>
      </header>
      <div className="brutal-card-flat bg-chalk p-5 md:p-7 space-y-4 text-[15px] leading-relaxed paper-texture">
        {children}
      </div>
    </article>
  );
}
