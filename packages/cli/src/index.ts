import { readFileSync } from "node:fs";
import { decodeRevertData } from "@revertwtf/parser/decode";
import { explain } from "@revertwtf/parser/explain";
import { explainAAError } from "@revertwtf/aa/explain";
import { searchCatalog, getCatalog } from "@revertwtf/catalog";

export type CliResult = { status: "ok" | "error"; output: string };

export function runCli(argv: string[]): CliResult {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    return { status: "ok", output: usage() };
  }
  try {
    switch (cmd) {
      case "decode":
        return decodeCmd(rest);
      case "explain":
        return explainCmd(rest);
      case "explain-json":
        return explainJsonCmd(rest);
      case "aa":
        return aaCmd(rest);
      case "catalog":
        return catalogCmd(rest);
      default:
        return { status: "error", output: `Unknown command: ${cmd}\n\n${usage()}` };
    }
  } catch (err) {
    return { status: "error", output: `Error: ${(err as Error).message}` };
  }
}

function decodeCmd(args: string[]): CliResult {
  const data = args[0];
  if (!data) return { status: "error", output: "Usage: revertwtf decode <0x...>" };
  const r = decodeRevertData(data);
  return { status: "ok", output: JSON.stringify(r, null, 2) };
}

function explainCmd(args: string[]): CliResult {
  const path = args[0];
  if (!path) return { status: "error", output: "Usage: revertwtf explain <path-to-json>" };
  const raw = readFileSync(path, "utf8");
  const input = JSON.parse(raw);
  const r = explain(input);
  return { status: "ok", output: format(r.explanations) };
}

function explainJsonCmd(args: string[]): CliResult {
  const raw = args.join(" ");
  if (!raw) return { status: "error", output: 'Usage: revertwtf explain-json \'{"code":-32603,...}\'' };
  const input = JSON.parse(raw);
  const r = explain(input);
  return { status: "ok", output: format(r.explanations) };
}

function aaCmd(args: string[]): CliResult {
  const raw = args.join(" ");
  if (!raw) return { status: "error", output: 'Usage: revertwtf aa "AA23 reverted or OOG"' };
  const explanations = explainAAError(raw);
  return { status: "ok", output: format(explanations) };
}

function catalogCmd(args: string[]): CliResult {
  const [sub, ...rest] = args;
  if (sub === "search") {
    const q = rest.join(" ");
    if (!q) return { status: "error", output: "Usage: revertwtf catalog search <query>" };
    const matches = searchCatalog(q);
    return { status: "ok", output: matches.map((e) => `${e.id.padEnd(40)} ${e.title}`).join("\n") };
  }
  if (sub === "list") {
    return { status: "ok", output: getCatalog().map((e) => `${e.id.padEnd(40)} ${e.title}`).join("\n") };
  }
  return { status: "error", output: "Usage: revertwtf catalog <list|search>" };
}

function format(explanations: ReturnType<typeof explain>["explanations"]): string {
  return explanations
    .map((e, i) => {
      const lines = [
        `[${i + 1}] ${e.title}  (${e.confidence})`,
        `    layer:    ${e.layer}`,
        `    category: ${e.category}`,
        `    summary:  ${e.summary}`,
        `    causes:`,
        ...e.likelyCauses.map((c) => `      - ${c}`),
        `    next steps:`,
        ...e.nextSteps.map((s) => `      - ${s}`),
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

function usage(): string {
  return `revertwtf <command>

  decode <0x...>            Decode revert bytes
  explain <file.json>       Explain a JSON error from disk
  explain-json '<json>'     Explain a JSON error from argv
  aa "<reason text>"        Decode/explain an ERC-4337 AA error
  catalog list              List all catalog entries
  catalog search <query>    Search catalog entries

Examples:
  revertwtf decode 0x4e487b71000000000000000000000000000000000000000000000000000000000000001
  revertwtf aa "AA23 reverted or OOG"
`;
}
