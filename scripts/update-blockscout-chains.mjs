import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = findRoot(process.cwd());
const OUT = join(ROOT, "packages", "catalog", "src", "data", "blockscout-chains.json");
const CHAINS_URL = "https://chains.blockscout.com/api/chains";
const USER_AGENT = "revertwtf-blockscout-chain-sync";

const res = await fetch(CHAINS_URL, {
  headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
});

if (!res.ok) {
  throw new Error(`Failed to fetch Blockscout chains: ${res.status} ${await res.text()}`);
}

const raw = await res.json();
const chains = Object.entries(raw)
  .map(([chainId, chain]) => normalizeChain(chainId, chain))
  .sort(compareChains);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(chains, null, 2)}\n`);
console.log(`blockscout chains: wrote ${chains.length} entries`);

function normalizeChain(chainId, chain) {
  return {
    chainId: String(chainId),
    name: stringValue(chain.name),
    description: stringValue(chain.description),
    ecosystem: arrayValue(chain.ecosystem),
    isTestnet: Boolean(chain.isTestnet),
    layer: typeof chain.layer === "number" ? chain.layer : Number(chain.layer ?? 0),
    rollupType: chain.rollupType === null || chain.rollupType === undefined ? null : stringValue(chain.rollupType),
    nativeCurrency: stringValue(chain.native_currency),
    website: stringValue(chain.website),
    logo: stringValue(chain.logo),
    settlementLayerChainId:
      chain.settlementLayerChainId === null || chain.settlementLayerChainId === undefined
        ? null
        : String(chain.settlementLayerChainId),
    explorers: Array.isArray(chain.explorers)
      ? chain.explorers.map((explorer) => ({
          url: stringValue(explorer.url),
          hostedBy: stringValue(explorer.hostedBy),
        }))
      : [],
  };
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" && item.length > 0).sort();
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function compareChains(a, b) {
  const numericA = Number(a.chainId);
  const numericB = Number(b.chainId);
  if (Number.isSafeInteger(numericA) && Number.isSafeInteger(numericB) && numericA !== numericB) {
    return numericA - numericB;
  }
  return a.chainId.localeCompare(b.chainId, "en", { numeric: true });
}

function findRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find repository root");
    dir = parent;
  }
}
