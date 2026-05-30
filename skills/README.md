# revert.wtf OpenClaw skills

OpenClaw loads workspace skills from `skills/<skill-name>/SKILL.md`.
These skills are repo-local operating guides for agents working on revert.wtf.

They are intentionally instruction-only: no secrets, no installers, no hidden
commands, and no network dependency at skill load time.

## Included skills

- `revertwtf-catalog-entry` - add or update individual catalog entries.
- `revertwtf-catalog-research` - run broader source-backed ecosystem coverage passes.
- `revertwtf-catalog-error-enrichment` - improve existing catalog explanations, actions, references, and helper metadata with evidence-locked sources.
- `revertwtf-parser-decoder` - change parser, decoder, selector, or AA behavior.
- `revertwtf-mcp-server` - maintain the read-only MCP agent interface.
- `revertwtf-agent-api` - consume revert.wtf safely through HTTP, MCP, or package subpaths.
- `revertwtf-frontend-product-ui` - work on the Next.js product surface.
- `revertwtf-release-readiness` - production verification and handoff checks.

For OpenClaw installs, point the agent workspace at this repository. Workspace
skills take precedence over shared or bundled skills with the same name.

For ClawHub publishing, submit each skill directory directly. The current skills
are instruction-only and do not require bundled scripts, generated assets, or
secret-bearing config.
