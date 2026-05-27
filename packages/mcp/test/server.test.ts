import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createRevertWtfMcpServer } from "../src/server.js";

function pad32(hex: string): string {
  const rem = hex.length % 64;
  return rem === 0 ? hex : hex + "0".repeat(64 - rem);
}
function hex32(n: number): string {
  return n.toString(16).padStart(64, "0");
}
function errorStringRevert(reason: string): string {
  const bytes = Buffer.from(reason, "utf8").toString("hex");
  return `0x08c379a0${hex32(32)}${hex32(reason.length)}${pad32(bytes)}`;
}

async function connect() {
  const server = createRevertWtfMcpServer();
  const client = new Client({ name: "revertwtf-test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { server, client };
}

function parseText(result: unknown): unknown {
  const r = result as { content: { type: string; text: string }[] };
  expect(r.content[0]?.type).toBe("text");
  return JSON.parse(r.content[0].text);
}

describe("mcp server", () => {
  it("registers and lists the documented tools and resources", async () => {
    const { client } = await connect();

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "catalog_stats",
        "decode_revert_data",
        "explain_aa_error",
        "explain_error",
        "get_blockscout_chain",
        "get_error",
        "list_sources",
        "lookup_selector",
        "search_blockscout_chains",
        "search_catalog",
      ].sort(),
    );

    for (const t of tools) {
      expect(t.inputSchema).toBeDefined();
      expect((t.inputSchema as { type?: string }).type).toBe("object");
    }

    const { resources } = await client.listResources();
    const resourceNames = resources.map((r) => r.name);
    expect(resourceNames).toContain("catalog-stats");
    expect(resourceNames).toContain("catalog-sources");
  });

  it("decodes a standard Error(string) revert", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "decode_revert_data",
      arguments: { data: errorStringRevert("ERC20: transfer amount exceeds balance") },
    });
    const decoded = parseText(result) as { kind: string; reason?: string };
    expect(decoded.kind).toBe("error_string");
    expect(decoded.reason).toBe("ERC20: transfer amount exceeds balance");
  });

  it("explains a nested -32603 RPC error", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "explain_error",
      arguments: {
        input: {
          code: -32603,
          message: "Internal JSON-RPC error",
          data: { code: 3, data: errorStringRevert("nope") },
        },
      },
    });
    const payload = parseText(result) as {
      explanations: { id: string }[];
      decoded: unknown[];
    };
    expect(payload.explanations.length).toBeGreaterThan(0);
    expect(payload.decoded.length).toBeGreaterThan(0);
  });

  it("explains an AA23 FailedOp", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "explain_aa_error",
      arguments: { input: 'FailedOp(0, "AA23 reverted or OOG")' },
    });
    const payload = parseText(result) as { explanations: { id: string }[] };
    expect(payload.explanations.some((e) => e.id === "aa-aa23")).toBe(true);
  });

  it("looks up a known 4-byte selector", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "lookup_selector",
      arguments: { selector: "0x08c379a0" },
    });
    const payload = parseText(result) as {
      selector: string;
      candidates: { signature: string }[];
    };
    expect(payload.selector).toBe("0x08c379a0");
    expect(Array.isArray(payload.candidates)).toBe(true);
  });

  it("returns catalog stats", async () => {
    const { client } = await connect();
    const result = await client.callTool({ name: "catalog_stats", arguments: {} });
    const stats = parseText(result) as { total: number };
    expect(typeof stats.total).toBe("number");
    expect(stats.total).toBeGreaterThan(0);
  });

  it("keeps catalog search responses bounded and paginated", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "search_catalog",
      arguments: { query: "", limit: 3 },
    });
    const payload = parseText(result) as {
      entries: { id: string; summary: string; resource: string }[];
      returned: number;
      totalMatches: number;
      hasMore: boolean;
    };
    expect(payload.entries).toHaveLength(3);
    expect(payload.returned).toBe(3);
    expect(payload.totalMatches).toBeGreaterThan(3);
    expect(payload.hasMore).toBe(true);
    expect(payload.entries[0]).not.toHaveProperty("patterns");
    expect(payload.entries[0]?.resource).toMatch(/^revertwtf:\/\/catalog\/errors\//);
  });

  it("keeps source listing responses bounded", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "list_sources",
      arguments: { limit: 2 },
    });
    const payload = parseText(result) as {
      sources: unknown[];
      returned: number;
      totalMatches: number;
      hasMore: boolean;
    };
    expect(payload.sources).toHaveLength(2);
    expect(payload.returned).toBe(2);
    expect(payload.totalMatches).toBeGreaterThan(2);
    expect(payload.hasMore).toBe(true);
  });

  it("surfaces a clean error for an unknown catalog id", async () => {
    const { client } = await connect();
    const result = await client.callTool({
      name: "get_error",
      arguments: { id: "definitely-not-an-id-xyz" },
    });
    expect((result as { isError?: boolean }).isError).toBe(true);
  });
});
