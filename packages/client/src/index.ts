import type { DecodedRevert, Explanation, NormalizedError, SignatureCandidate } from "@revertwtf/core";

const DEFAULT_BASE_URL = "https://revert.wtf";

export interface RevertClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  apiKey?: string;
  headers?: Record<string, string>;
}

export class RevertApiError extends Error {
  retryAfter?: string | null;

  constructor(public status: number, public body: unknown, message: string, retryAfter?: string | null) {
    super(message);
    this.name = "RevertApiError";
    this.retryAfter = retryAfter;
  }
}

export interface ExplainResult {
  normalized: NormalizedError;
  decoded: { data: string; path: string; result: DecodedRevert }[];
  explanations: Explanation[];
}

export interface DecodeRevertInput {
  data: string;
  abiText?: string;
}

export interface AADecodeInput {
  raw: string;
}

export interface AADecodeResult {
  explanations: Explanation[];
  decoded: unknown | null;
}

export type SelectorMatch = SignatureCandidate;

export interface SearchCatalogInput {
  query?: string;
  source?: string;
  layer?: string;
  category?: string;
  shardId?: string;
  limit?: number;
  offset?: number;
}

export interface CatalogSearchSummary {
  id: string;
  title: string;
  layer: string;
  source: string;
  sourceDisplayName?: string;
  sourceLifecycle?: string;
  category: string;
  confidence: string;
  summary: string;
  retryHelpful: string;
  increasingGasHelpful: string;
  rootCauseKnown: boolean;
  shardId: string;
}

export interface SearchCatalogResult {
  entries: CatalogSearchSummary[];
  totalMatches: number;
  returned: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface RevertClient {
  explain(raw: string): Promise<Explanation[] | null>;
  explainFull(raw: string): Promise<ExplainResult | null>;
  decodeRevert(input: DecodeRevertInput): Promise<DecodedRevert | null>;
  decodeAA(input: AADecodeInput): Promise<AADecodeResult | null>;
  resolveSelector(selector: string): Promise<SelectorMatch[] | null>;
  searchCatalog(input: SearchCatalogInput): Promise<SearchCatalogResult>;
}

export function createRevertClient(opts: RevertClientOptions = {}): RevertClient {
  return {
    async explain(raw) {
      const result = await explainFull(raw, opts);
      return result?.explanations ?? null;
    },
    explainFull: (raw) => explainFull(raw, opts),
    decodeRevert: (input) => decodeRevert(input, opts),
    decodeAA: (input) => decodeAA(input, opts),
    resolveSelector: (selector) => resolveSelector(selector, opts),
    searchCatalog: (input) => searchCatalog(input, opts),
  };
}

export async function explain(raw: string, opts?: RevertClientOptions): Promise<Explanation[] | null> {
  const result = await explainFull(raw, opts);
  return result?.explanations ?? null;
}

export async function explainFull(raw: string, opts?: RevertClientOptions): Promise<ExplainResult | null> {
  return postJson<ExplainResult | null>("/api/explain", { raw }, opts);
}

export async function decodeRevert(
  input: DecodeRevertInput,
  opts?: RevertClientOptions,
): Promise<DecodedRevert | null> {
  return postJson<DecodedRevert | null>("/api/revert-decode", input, opts);
}

export async function decodeAA(input: AADecodeInput, opts?: RevertClientOptions): Promise<AADecodeResult | null> {
  return postJson<AADecodeResult | null>("/api/aa-decode", input, opts);
}

export async function resolveSelector(
  selector: string,
  opts?: RevertClientOptions,
): Promise<SelectorMatch[] | null> {
  return postJson<SelectorMatch[] | null>("/api/selector", { selector }, opts);
}

export async function searchCatalog(
  input: SearchCatalogInput,
  opts?: RevertClientOptions,
): Promise<SearchCatalogResult> {
  return postJson<SearchCatalogResult>("/api/search", input, opts);
}

async function postJson<T>(path: string, body: unknown, opts: RevertClientOptions = {}): Promise<T> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation available. Pass { fetch } to createRevertClient().");
  }

  const response = await fetchImpl(urlFor(path, opts.baseUrl), {
    method: "POST",
    headers: headersFor(opts),
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  const payload = await readResponseBody(response);

  if (!response.ok) {
    const message = messageFromErrorBody(payload) ?? `revert.wtf API request failed with ${response.status}`;
    throw new RevertApiError(response.status, payload, message, response.headers.get("retry-after"));
  }

  return payload as T;
}

function headersFor(opts: RevertClientOptions): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(opts.apiKey ? { "x-revertwtf-key": opts.apiKey } : {}),
    ...(opts.headers ?? {}),
  };
}

function urlFor(path: string, baseUrl = DEFAULT_BASE_URL): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromErrorBody(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return null;
}
