---
name: revertwtf-release-readiness
description: Run production-readiness checks for revert.wtf packages, catalog data, MCP server, frontend, Docker/Coolify deployment, docs, and generated artifacts.
version: 0.1.0
---

# revert.wtf Release Readiness Skill

Use this skill before production, launch, partner demos, Coolify deployment, package publishing, or major handoff.

## Release Principles

- Runtime explanations should come from package data, local decoding, and caller-provided input.
- Generated artifacts must be synchronized with source data.
- The site, CLI, MCP, and packages must agree because they consume the same package boundaries.
- Open-source means no hidden payment gates, no opaque hosted-only logic, and no secret-bearing config in the repo.

## Checklist

1. Catalog data:
   ```bash
   node scripts/build-catalog-data.mjs --generate --dist --check
   node --experimental-strip-types scripts/validate-catalog.ts
   node scripts/check-catalog-duplicates.mjs --fail-on=id,same-source-selector
   ```
2. Package typechecks:
   ```bash
   node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/catalog/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/selectors/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/parser/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/aa/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/client/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/search/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.json --noEmit
   node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.json --noEmit
   ```
3. Web typecheck:
   ```bash
   node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit
   ```
4. Targeted tests when the local environment allows:
   ```bash
   pnpm --filter @revertwtf/catalog test
   pnpm --filter @revertwtf/parser test
   pnpm --filter @revertwtf/aa test
   pnpm --filter @revertwtf/cli test
   pnpm --filter @revertwtf/mcp test
   ```
5. Package metadata:
   - Publishable package versions should stay at `0.1.0` until the first npm release.
   - Package manifests should include `license`, `repository`, `homepage`, `bugs`, `files`, and the correct `exports` or `bin` surface.
   - Browser-safe packages should avoid accidental catalog imports; heavy catalog-backed APIs belong on server/API boundaries.
6. Docker/Coolify:
   - Root `Dockerfile` should copy every package `package.json` needed for dependency installation.
   - Web build uses Next standalone output.
   - Health check hits `/errors`.
   - `.dockerignore` should keep caches, node_modules, dist, docs, fixtures, and local metadata out of the image.

## Known Local Caveat

On this Windows workspace, recursive pnpm scripts, Vitest, Next dev/build, or child-process stdio MCP smokes can fail with `spawn EPERM`. Do not hide that. Use direct `tsc`, in-memory MCP tests, and bounded smoke checks, then report which process-spawn checks were blocked.

## Final Handoff

Summarize:

- what changed,
- which commands passed,
- which checks could not run and why,
- any remaining production risk,
- exact files touched when useful.
