# Local-first HyperFrames Video Factory

## Intent

Build a reusable TikTok video factory rather than a one-video project. Templates, episode manifests, and asset metadata are durable source; compiled HyperFrames workspaces and all render artifacts stay local and are reproducible.

## Goals

- Reuse scene templates and an asset catalog across many clips.
- Describe each clip with a small JSON episode manifest.
- Generate a self-contained HyperFrames workspace for every episode.
- Script repeated setup, validation, compilation, checking, rendering, and cleanup tasks.
- Keep the initial system dependency-light and understandable.
- Document setup and agent conventions in concise project files.

## Non-goals

- Uploading artifacts or assets to cloud storage.
- Publishing automatically to TikTok.
- Building a queue, dashboard, API server, or distributed renderer.
- Supporting arbitrary user-authored template languages in the first version.

## Constraints

- Local-first storage for assets, snapshots, frames, drafts, and final renders.
- Node.js 22 or newer, FFmpeg/FFprobe, and a project-local pinned HyperFrames CLI.
- Factory code uses Node.js standard library only.
- Generated workspaces and render artifacts are excluded from Git.
- `CLAUDE.md` and `AGENT.md` remain under 100 lines each.

## Architecture

The repository has four durable layers: reusable templates, a local media library plus catalog, episode manifests, and pipeline scripts. `compile` resolves an episode and template, stages referenced assets, replaces a small fixed placeholder set, and writes a standalone project under `workspaces/<episode-id>`. HyperFrames commands operate only on that generated workspace.

Artifacts are separated by lifecycle: `.hyperframes/` is CLI-managed state, `artifacts/` holds temporary review evidence and frames, `renders/` holds local drafts and finals, and `workspaces/` is entirely reproducible. None are committed.

## Approaches considered

1. One composition with batch variables: simplest, but root duration and scene structure cannot vary cleanly.
2. Compile-per-episode factory: selected because clips can vary while templates and assets remain reusable.
3. Multi-package render service: deferred because cloud storage, queues, and workers are not needed yet.

## Key interfaces

- `episodes/<id>/episode.json`: source of content, timing, template, theme, and asset references.
- `library/catalog.json`: maps stable asset IDs to local files and metadata.
- `templates/<name>/`: self-contained HTML composition templates with approved placeholders.
- `scripts/compile.mjs <episode>`: writes `workspaces/<id>`.
- `scripts/check.mjs <episode>`: compiles, lints, checks TikTok safe zones, and snapshots.
- `scripts/render.mjs <episode>`: compiles, validates, and renders to `renders/<id>`.
- `scripts/setup-machine.sh --check|--install`: verifies or installs machine prerequisites.

## Storage policy

- Git: templates, scripts, manifests, catalog metadata, tests, and docs.
- Local durable: `library/` source media and `renders/*/final*`.
- Local reproducible: `workspaces/`, snapshots, frames, draft renders, and caches.
- `.hyperframes/` is never deleted wholesale because it may contain project history.

## Open extension points

- Replace local asset paths with object-store URIs later without changing episode manifests.
- Add more templates and template-specific schema validation.
- Add a render queue or cloud renderer after local production volume justifies it.
