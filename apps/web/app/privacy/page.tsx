import { DocShell } from "@/components/DocShell";
import { REPO_URL } from "@/lib/site";

export const metadata = {
  title: "privacy policy - revert.wtf",
  description:
    "Privacy policy for revert.wtf, including website tools, catalog pages, packages, MCP server, and agent skills.",
};

export default function PrivacyPage() {
  return (
    <DocShell kicker="/privacy" title="privacy policy">
      <p className="brutal-card-flat bg-acid p-4">
        <strong>Effective date: May 26, 2026.</strong> revert.wtf is an
        open-source EVM error explanation project. The public website is built
        for reading docs, browsing the catalog, and running decoder tools.
      </p>

      <h2 className="font-display text-4xl mt-8">what we collect</h2>
      <p>
        We do not require accounts, wallet connections, payments, or API keys to
        use the public website.
      </p>
      <p>
        Decoder inputs are sent to revert.wtf only to produce the requested
        explanation or decoded output. We do not intentionally store or review
        pasted revert data, RPC errors, traces, wallet errors, x402 payloads, or
        ABI snippets through those tools.
      </p>
      <p>
        Like most websites, the hosting provider may process basic request logs
        such as IP address, requested URL, user agent, referrer, response status,
        and timestamp. These logs are used for uptime, abuse prevention,
        debugging, and security.
      </p>

      <h2 className="font-display text-4xl mt-8">what not to paste</h2>
      <p>
        Do not paste private keys, seed phrases, signing secrets, access tokens,
        production API keys, unreleased exploit details, or personal data into
        the website. Error payloads can contain addresses, calldata, signatures,
        metadata, endpoint names, and internal system details.
      </p>

      <h2 className="font-display text-4xl mt-8">packages, MCP, and skills</h2>
      <p>
        The npm packages, MCP server, CLI, and OpenClaw skills are intended to
        run in your own environment. Data processed by those tools is controlled
        by the environment where you run them. If you wire revert.wtf into a
        product, support console, agent, log pipeline, or hosted service, you are
        responsible for your own logging, retention, access control, and user
        notices.
      </p>

      <h2 className="font-display text-4xl mt-8">third-party links</h2>
      <p>
        The site links to GitHub, npm, ClawHub, standards pages, protocol docs,
        and other external references. Those services have their own privacy
        practices and policies.
      </p>

      <h2 className="font-display text-4xl mt-8">changes</h2>
      <p>
        We may update this policy as the project changes. Material changes
        should be reflected in the{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-link">
          repository
        </a>{" "}
        and on this page.
      </p>

      <h2 className="font-display text-4xl mt-8">contact</h2>
      <p>
        For privacy questions or reports, open an issue or security contact
        through the{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="brutal-link">
          project repository
        </a>.
      </p>
    </DocShell>
  );
}
