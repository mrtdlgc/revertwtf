---
name: revertwtf-frontend-product-ui
description: Work on the revert.wtf Next.js frontend as a distinctive error-forensics product surface, not a generic SaaS or stock brutalist page.
version: 0.1.0
---

# revert.wtf Frontend Product UI Skill

Use this skill when changing `apps/web`, visual design, UX, docs pages, tools, catalog browsing, or frontend verification.

## Design Direction

The site should feel like an error-forensics instrument:

- dark lab shell
- evidence report cards
- byte/selector/spectrogram motifs
- dense but legible technical surfaces
- actual parser/tool experience on the first screen
- no generic SaaS hero, no stock dashboards, no decorative purple blobs, no generic terminal-starter styling

The user specifically disliked generic styling. Push for a unique product identity tied to EVM errors and debugging evidence.

## Architecture Rules

- The website must remain a consumer of packages, not a separate explanation engine.
- Do not duplicate parser/catalog logic in React components.
- Do not import catalog-backed parser/AA/selector lookup into `"use client"` components. Client tools should call `apps/web/app/api/*` routes or use tiny package subpaths like `@revertwtf/catalog/panic`.
- Keep homepage and tools from shipping the full catalog in JS chunks. A simple page load or selector lookup must not download megabytes of catalog data.
- Keep reusable behavior in packages when it affects explanations.
- Keep docs pages aligned with root docs and package READMEs.

## Workflow

1. Inspect the current component/page before editing.
2. Preserve existing routes:
   - `/`
   - `/errors`
   - `/errors/[id]`
   - `/catalog`
   - `/tools/*`
   - `/docs/*`
   - `/about`
3. Design for scanner/debugger workflows:
   - paste raw error
   - inspect ranked explanation
   - inspect evidence
   - decode raw bytes
   - browse catalog
4. Check mobile and desktop text containment. Long ids, selectors, URLs, and JSON must wrap or scroll safely.
5. Avoid in-app prose explaining obvious UI controls.

## Verification

```bash
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit
```

If possible, run the app and visually inspect core routes:

```bash
pnpm --filter @revertwtf/web dev
```

If Next dev/build fails with local Windows `spawn EPERM`, report the limitation and at least run direct `tsc` plus Tailwind compilation:

```bash
node node_modules/tailwindcss/lib/cli.js -c tailwind.config.ts -i app/globals.css --minify
```

Run that Tailwind command from `apps/web`.
