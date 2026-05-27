import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  // @revertwtf/catalog loads its shard JSON at runtime via createRequire
  // (`./shards/<id>.json`), which Next's tracer cannot follow, so the files are
  // not copied into the standalone output and every catalog-backed route 500s
  // with MODULE_NOT_FOUND. Force-include them. The Dockerfile also copies them
  // explicitly as a guarantee for the Coolify image.
  outputFileTracingIncludes: {
    "/**": ["../../packages/catalog/dist/data/shards/**/*.json"],
  },
  reactStrictMode: true,
  typedRoutes: false,
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: [
    "@revertwtf/core",
    "@revertwtf/catalog",
    "@revertwtf/selectors",
    "@revertwtf/parser",
    "@revertwtf/aa",
  ],
};

export default nextConfig;
