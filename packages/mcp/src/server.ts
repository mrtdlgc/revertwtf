import type { Explanation } from "@revertwtf/core";
import type { CatalogEntry } from "@revertwtf/catalog";
import {
  getBlockscoutChain,
  getBlockscoutChainStats,
  getCatalogSourceMetadata,
  getKnownCatalogSources,
  searchBlockscoutChains,
} from "@revertwtf/catalog";
import { getCatalogStats, getEntry, searchCatalog } from "@revertwtf/search";
import { explainAAError } from "@revertwtf/aa/explain";
import { decodeRevertData } from "@revertwtf/parser/decode";
import { explain } from "@revertwtf/parser/explain";
import { lookupSelector } from "@revertwtf/selectors";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const VERSION = "0.1.0";
const JSON_MIME = "application/json";
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const MAX_ERROR_INPUT_CHARS = 64_000;

export function createRevertWtfMcpServer(): McpServer {
  const server = new McpServer({
    name: "revertwtf",
    version: VERSION,
  });

  server.registerTool(
    "explain_error",
    {
      title: "Explain EVM/RPC Error",
      description:
        "Normalize and explain an EVM, JSON-RPC, wallet, library, simulation trace, x402, or raw revert error.",
      inputSchema: {
        input: z.unknown().describe("Raw error object, raw string, or JSON string to explain."),
        abi: z.unknown().optional().describe("Optional ABI array or JSON string used to decode custom errors."),
        maxExplanations: z.number().int().min(1).max(20).optional().describe("Maximum explanations to return."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ input, abi, maxExplanations }) => {
      const parsed = parseMaybeJson(input);
      const result = explain(parsed, { abi: parseAbi(abi) });
      return jsonToolResult({
        explanations: result.explanations.slice(0, maxExplanations ?? 8).map(summarizeExplanation),
        decoded: result.decoded.map((item) => ({
          path: item.path,
          data: item.data,
          result: item.result,
        })),
        normalized: {
          messages: result.normalized.messages.slice(0, 12),
          codes: result.normalized.codes.slice(0, 12),
          method: result.normalized.method,
          action: result.normalized.action,
          errorName: result.normalized.errorName,
          revertData: result.normalized.revertData.slice(0, 12),
          traceFrames: result.normalized.traceFrames.slice(-4),
        },
      });
    },
  );

  server.registerTool(
    "decode_revert_data",
    {
      title: "Decode Revert Data",
      description: "Decode raw EVM revert bytes as Error(string), Panic(uint256), or a custom error selector.",
      inputSchema: {
        data: z.string().describe("0x-prefixed revert data."),
        abi: z.unknown().optional().describe("Optional ABI array or JSON string used to decode custom errors."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ data, abi }) => jsonToolResult(decodeRevertData(capText(data) as `0x${string}`, { abi: parseAbi(abi) })),
  );

  server.registerTool(
    "search_catalog",
    {
      title: "Search Error Catalog",
      description: "Search reviewed catalog entries by text, source, layer, or category.",
      inputSchema: {
        query: z.string().optional().describe("Text to search. Empty returns filtered catalog entries."),
        source: z.string().optional().describe("Optional source id, such as x402, ethereum-protocol, or blockscout."),
        layer: z.string().optional().describe("Optional layer filter, such as evm, rpc, protocol, provider, wallet."),
        category: z.string().optional().describe("Optional category filter."),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe("Maximum summary entries to return."),
        offset: z.number().int().min(0).optional().describe("Zero-based pagination offset."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ query = "", source, layer, category, limit = DEFAULT_LIST_LIMIT, offset = 0 }) => {
      const matches = searchCatalog({ query, source, layer, category, limit, offset });
      const entries = matches.entries.map(summarizeCatalogEntry);
      return jsonToolResult({
        entries,
        returned: entries.length,
        totalMatches: matches.totalMatches,
        offset,
        limit,
        hasMore: matches.hasMore,
      });
    },
  );

  server.registerTool(
    "get_error",
    {
      title: "Get Catalog Error",
      description: "Fetch one full catalog entry by id.",
      inputSchema: {
        id: z.string().describe("Catalog entry id."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ id }) => jsonToolResult(getEntryOrThrow(id)),
  );

  server.registerTool(
    "catalog_stats",
    {
      title: "Catalog Stats",
      description: "Return catalog totals by layer and category.",
      inputSchema: {},
      annotations: readOnlyAnnotations(),
    },
    async () => jsonToolResult(getCatalogStats()),
  );

  server.registerTool(
    "list_sources",
    {
      title: "List Catalog Sources",
      description: "List known catalog source metadata, including renamed, legacy, and sunsetting sources.",
      inputSchema: {
        query: z.string().optional().describe("Optional source id, display name, alias, lifecycle, or note text."),
        lifecycle: z.enum(["current", "legacy", "renamed", "sunsetting"]).optional().describe("Optional lifecycle filter."),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe("Maximum source records to return."),
        offset: z.number().int().min(0).optional().describe("Zero-based pagination offset."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ query = "", lifecycle, limit = DEFAULT_LIST_LIMIT, offset = 0 }) => {
      const q = query.trim().toLowerCase();
      const matches = getKnownCatalogSources()
        .filter((source) => (lifecycle ? source.lifecycle === lifecycle : true))
        .filter((source) =>
          q
            ? [
                source.id,
                source.displayName,
                source.lifecycle,
                source.note,
                ...(source.aliases ?? []),
              ]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLowerCase().includes(q))
            : true,
        );
      const sources = matches.slice(offset, offset + limit);
      return jsonToolResult({
        sources,
        returned: sources.length,
        totalMatches: matches.length,
        offset,
        limit,
        hasMore: offset + sources.length < matches.length,
      });
    },
  );

  server.registerTool(
    "lookup_selector",
    {
      title: "Lookup Error Selector",
      description: "Resolve a 4-byte EVM custom error selector to known signature candidates.",
      inputSchema: {
        selector: z.string().describe("0x-prefixed 4-byte selector, e.g. 0xe450d38c."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ selector }) => jsonToolResult({ selector, candidates: lookupSelector(selector) }),
  );

  server.registerTool(
    "explain_aa_error",
    {
      title: "Explain ERC-4337 Error",
      description: "Explain ERC-4337 AAxx codes or EntryPoint FailedOp revert payloads.",
      inputSchema: {
        input: z.unknown().describe("AA error string/object or EntryPoint revert data."),
        maxExplanations: z.number().int().min(1).max(20).optional().describe("Maximum explanations to return."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ input, maxExplanations }) =>
      jsonToolResult({
        explanations: explainAAError(parseMaybeJson(input))
          .slice(0, maxExplanations ?? 8)
          .map(summarizeExplanation),
      }),
  );

  server.registerTool(
    "get_blockscout_chain",
    {
      title: "Get Blockscout Chain",
      description: "Fetch one chain record from the bundled Blockscout/Chainscout registry by chain id.",
      inputSchema: {
        chainId: z.union([z.string(), z.number()]).describe("Numeric chain id, as string or number."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ chainId }) => {
      const chain = getBlockscoutChain(chainId);
      if (!chain) throw new Error(`Unknown Blockscout chain id: ${String(chainId)}`);
      return jsonToolResult(chain);
    },
  );

  server.registerTool(
    "search_blockscout_chains",
    {
      title: "Search Blockscout Chains",
      description: "Search the bundled Blockscout/Chainscout registry.",
      inputSchema: {
        query: z.string().describe("Chain name, ecosystem, website, native currency, hostedBy, or chain id."),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe("Maximum chain records to return."),
        offset: z.number().int().min(0).optional().describe("Zero-based pagination offset."),
      },
      annotations: readOnlyAnnotations(),
    },
    async ({ query, limit = DEFAULT_LIST_LIMIT, offset = 0 }) => {
      const matches = searchBlockscoutChains(query);
      const chains = matches.slice(offset, offset + limit);
      return jsonToolResult({
        chains,
        returned: chains.length,
        totalMatches: matches.length,
        offset,
        limit,
        hasMore: offset + chains.length < matches.length,
        stats: getBlockscoutChainStats(),
      });
    },
  );

  registerResources(server);
  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createRevertWtfMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function registerResources(server: McpServer): void {
  server.registerResource(
    "catalog-stats",
    "revertwtf://catalog/stats",
    {
      title: "revert.wtf catalog stats",
      description: "Catalog totals by layer and category.",
      mimeType: JSON_MIME,
    },
    async (uri) => jsonResource(uri.href, getCatalogStats()),
  );

  server.registerResource(
    "catalog-sources",
    "revertwtf://catalog/sources",
    {
      title: "revert.wtf catalog sources",
      description: "Known catalog source metadata.",
      mimeType: JSON_MIME,
    },
    async (uri) => jsonResource(uri.href, { sources: getKnownCatalogSources() }),
  );

  server.registerResource(
    "catalog-error",
    new ResourceTemplate("revertwtf://catalog/errors/{id}", { list: undefined }),
    {
      title: "Catalog error entry",
      description: "Full catalog entry by id.",
      mimeType: JSON_MIME,
    },
    async (uri, params) => jsonResource(uri.href, getEntryOrThrow(paramValue(params.id))),
  );

  server.registerResource(
    "catalog-source",
    new ResourceTemplate("revertwtf://catalog/sources/{source}", { list: undefined }),
    {
      title: "Catalog source metadata",
      description: "Catalog source lifecycle, aliases, notes, and references.",
      mimeType: JSON_MIME,
    },
    async (uri, params) => jsonResource(uri.href, getCatalogSourceMetadata(paramValue(params.source))),
  );

  server.registerResource(
    "blockscout-chain",
    new ResourceTemplate("revertwtf://blockscout/chains/{chainId}", { list: undefined }),
    {
      title: "Blockscout chain",
      description: "One Blockscout/Chainscout registry chain record.",
      mimeType: JSON_MIME,
    },
    async (uri, params) => {
      const chainId = paramValue(params.chainId);
      const chain = getBlockscoutChain(chainId);
      if (!chain) throw new Error(`Unknown Blockscout chain id: ${chainId}`);
      return jsonResource(uri.href, chain);
    },
  );
}

function summarizeExplanation(explanation: Explanation): Explanation {
  return {
    ...explanation,
    evidence: explanation.evidence.slice(0, 12),
    likelyCauses: explanation.likelyCauses.slice(0, 8),
    nextSteps: explanation.nextSteps.slice(0, 8),
  };
}

function summarizeCatalogEntry(entry: CatalogEntry) {
  return {
    id: entry.id,
    title: entry.title,
    layer: entry.layer,
    source: entry.source,
    sourceDisplayName: entry.sourceDisplayName,
    sourceLifecycle: entry.sourceLifecycle,
    category: entry.category,
    summary: entry.summary,
    retryHelpful: entry.retryHelpful,
    increasingGasHelpful: entry.increasingGasHelpful,
    confidence: entry.confidence,
    resource: `revertwtf://catalog/errors/${entry.id}`,
  };
}

function getEntryOrThrow(id: string) {
  const entry = getEntry(id);
  if (!entry) throw new Error(`Unknown catalog entry id: ${id}`);
  return entry;
}

function parseMaybeJson(input: unknown): unknown {
  if (typeof input !== "string") return input;
  const trimmed = capText(input).trim();
  if (!trimmed) return input;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return input;
  try {
    return JSON.parse(trimmed);
  } catch {
    return input;
  }
}

function capText(value: string): string {
  return value.length > MAX_ERROR_INPUT_CHARS ? value.slice(0, MAX_ERROR_INPUT_CHARS) : value;
}

function parseAbi(input: unknown): never | undefined {
  const parsed = parseMaybeJson(input);
  return Array.isArray(parsed) ? (parsed as never) : undefined;
}

function jsonToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${JSON.stringify(value, null, 2)}\n`,
      },
    ],
  };
}

function jsonResource(uri: string, value: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: JSON_MIME,
        text: `${JSON.stringify(value, null, 2)}\n`,
      },
    ],
  };
}

function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    openWorldHint: false,
  };
}

function paramValue(value: string | string[] | undefined): string {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) throw new Error("Missing resource parameter");
  return resolved;
}
