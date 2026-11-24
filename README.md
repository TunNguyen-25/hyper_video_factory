# HyperFrames TikTok Video Factory

A local-first factory for generating reusable 9:16 TikTok videos. Templates, episode manifests, and asset metadata are source-controlled; each episode compiles into a disposable, self-contained HyperFrames workspace.

## Requirements

- Node.js 22+
- npm
- FFmpeg and FFprobe
- Git
- HyperFrames CLI, installed locally by `npm ci`

Check the current machine:

```bash
npm run setup:check
```

Install supported prerequisites on macOS/Homebrew or Debian/Ubuntu:

```bash
npm run setup:install
```

Install mode changes the machine and may use Homebrew, `apt`, `sudo`, and the official NodeSource Node 22 repository.

## Project layout

```text
templates/       Reusable HyperFrames video formats
library/         Local source media and catalog.json
episodes/        One episode.json manifest per clip
scripts/         Validate, compile, check, render, clean, and setup workflows
test/            Node.js tests for factory behavior
workspaces/      Generated HyperFrames projects; ignored by Git
artifacts/       Local snapshots, frames, and QC output; ignored by Git
renders/         Local draft/final videos; ignored by Git
```

`.hyperframes/` is managed by HyperFrames and can contain project history. Do not delete it wholesale; use `hyperframes clean --dry-run` and `hyperframes clean` when needed.

## Everyday workflow

Run factory commands from the repository root. Compilation replaces the generated episode workspace, so do not keep a shell inside `workspaces/<episode-id>` while compiling it.

```bash
# Validate an episode manifest and asset IDs
npm run validate -- demo

# Generate workspaces/demo
npm run compile -- demo

# Compile, lint, check TikTok safe zones, and make review snapshots
npm run check -- demo

# Draft render
npm run render -- demo --quality draft

# Delivery-quality local render
npm run render -- demo --quality delivery

# Inspect generated cleanup targets
npm run clean -- --dry-run

# Remove disposable workspaces/artifacts/draft directory
npm run clean -- --yes
```

Run tests with `npm test`.

## Create an episode

Copy `episodes/demo/episode.json` to `episodes/<id>/episode.json`, then change the content, duration, theme, and asset references. IDs use lowercase letters, numbers, and hyphens.

Assets are referenced by stable IDs from `library/catalog.json`:

```json
{
  "image.product-hero": {
    "path": "images/product-hero.webp",
    "type": "image",
    "license": "owned"
  }
}
```

An episode maps a template slot to that asset ID:

```json
{
  "assets": {
    "hero": "image.product-hero"
  }
}
```

Compilation copies only referenced assets into `workspaces/<id>/assets/library/`. Templates can use `{{ASSET_HERO}}` for the example slot.

## Create a template

1. Copy `templates/faceless-listicle/` to a new lowercase template ID.
2. Keep one scene per file under `compositions/`.
3. Use the supported placeholders visible in the example template.
4. Set the episode's `template` field to the new ID.
5. Run `npm test`, then `npm run check -- <episode-id>`.

The compiler rejects unknown placeholders, unknown asset IDs, missing files, unsafe asset paths, and invalid manifests before replacing an existing workspace.

## Git and local storage

Commit templates, scripts, tests, episode manifests, catalog metadata, and documentation. Do not commit `.hyperframes/`, workspaces, snapshots, raw frames, renders, caches, secrets, or `node_modules/`.

Final renders are local for now. The episode and asset interfaces are designed so object storage can be added later without rewriting templates.
