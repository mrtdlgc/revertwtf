import { DocShell } from "@/components/DocShell";

export const metadata = {
  title: "terms - revert.wtf",
  description:
    "Terms for using the revert.wtf website, packages, catalog, MCP server, CLI, and agent skills.",
};

export default function TermsPage() {
  return (
    <DocShell kicker="/terms" title="terms">
      <p className="brutal-card-flat bg-acid p-4">
        <strong>Effective date: May 26, 2026.</strong> These terms apply to the
        public revert.wtf website and project materials. They are written as a
        plain-language project policy, not as a substitute for legal advice.
      </p>

      <h2 className="font-display text-4xl mt-8">what revert.wtf provides</h2>
      <p>
        revert.wtf provides EVM error explanations, catalog data, local decoder
        packages, a CLI, a read-only MCP server, and agent skill files. The
        project helps developers, protocol teams, support teams, wallets, and
        agents understand likely causes and next steps when an error occurs.
      </p>

      <h2 className="font-display text-4xl mt-8">acceptable use</h2>
      <p>
        Use the website and project materials responsibly. Do not attempt to
        disrupt the service, overload hosted infrastructure, bypass access
        controls, upload malicious content, or use the project to harm users,
        protocols, wallets, agents, or infrastructure providers.
      </p>

      <h2 className="font-display text-4xl mt-8">not final advice</h2>
      <p>
        Error explanations are diagnostic aids. They may be incomplete,
        outdated, ambiguous, or wrong for a specific transaction, chain,
        provider, contract version, wallet, or integration. You are responsible
        for validating behavior before shipping code, sending transactions,
        changing funds flow, or giving user-facing advice.
      </p>

      <h2 className="font-display text-4xl mt-8">open source materials</h2>
      <p>
        Source code and package materials are distributed under the license in
        the project repository. Some referenced protocol docs, standards,
        package registries, explorer data, or external links may be governed by
        their own terms.
      </p>

      <h2 className="font-display text-4xl mt-8">catalog contributions</h2>
      <p>
        If you contribute catalog entries, fixtures, docs, code, skill files, or
        other materials, you should only submit content you have the right to
        contribute. Do not submit secrets, private customer data, confidential
        incident data, or proprietary material unless you have permission.
      </p>

      <h2 className="font-display text-4xl mt-8">availability</h2>
      <p>
        The public website may change, move, break, or become unavailable. The
        packages and repository are the durable integration surface for products
        that need tighter operational control.
      </p>

      <h2 className="font-display text-4xl mt-8">warranty boundary</h2>
      <p>
        The project is provided as-is, without guarantees that it will be
        accurate, secure, available, or fit for a particular purpose. To the
        extent permitted by law, the maintainers are not liable for losses
        arising from use of the website, packages, catalog, MCP server, CLI, or
        skills.
      </p>

      <h2 className="font-display text-4xl mt-8">changes</h2>
      <p>
        We may update these terms as the project changes. Continued use of the
        website or project materials after an update means you accept the
        updated terms.
      </p>
    </DocShell>
  );
}
