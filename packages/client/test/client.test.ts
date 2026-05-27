import { describe, expect, it } from "vitest";
import { createRevertClient, RevertApiError, resolveSelector } from "../src/index.js";

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    })) as typeof fetch;
}

describe("@revertwtf/client", () => {
  it("returns explanations from the hosted explain response", async () => {
    const client = createRevertClient({
      baseUrl: "https://example.test",
      fetch: mockFetch(200, { explanations: [{ id: "nonce-too-low" }], decoded: [], normalized: {} }),
    });

    await expect(client.explain('{"code":-32000}')).resolves.toEqual([{ id: "nonce-too-low" }]);
  });

  it("posts selector lookups", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = (async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify([{ selector: "0x08c379a0", signature: "Error(string)" }]), { status: 200 });
    }) as typeof fetch;

    const result = await resolveSelector("0x08c379a0", { baseUrl: "https://example.test/", fetch: fetchImpl });
    expect(calls[0]).toBe("https://example.test/api/selector");
    expect(result?.[0]?.signature).toBe("Error(string)");
  });

  it("throws structured errors for 400s", async () => {
    const client = createRevertClient({
      fetch: mockFetch(400, { error: "bad request" }),
    });

    await expect(client.decodeRevert({ data: "nope" })).rejects.toMatchObject({
      status: 400,
      body: { error: "bad request" },
      message: "bad request",
    });
  });

  it("preserves retry-after on 429", async () => {
    const client = createRevertClient({
      fetch: mockFetch(429, { error: "rate limited" }, { "retry-after": "12" }),
    });

    try {
      await client.explain("nonce too low");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RevertApiError);
      expect((err as RevertApiError).status).toBe(429);
      expect((err as RevertApiError).retryAfter).toBe("12");
    }
  });

  it("throws structured errors for 500s", async () => {
    const client = createRevertClient({
      fetch: mockFetch(500, { error: "server broke" }),
    });

    await expect(client.decodeAA({ raw: "AA23" })).rejects.toMatchObject({
      status: 500,
      message: "server broke",
    });
  });

  it("posts catalog searches", async () => {
    let posted: unknown;
    const client = createRevertClient({
      baseUrl: "https://example.test",
      fetch: (async (_input, init) => {
        posted = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ entries: [], totalMatches: 0, returned: 0, limit: 20, offset: 0, hasMore: false }), { status: 200 });
      }) as typeof fetch,
    });

    await client.searchCatalog({ query: "AA23", limit: 20 });
    expect(posted).toEqual({ query: "AA23", limit: 20 });
  });
});
