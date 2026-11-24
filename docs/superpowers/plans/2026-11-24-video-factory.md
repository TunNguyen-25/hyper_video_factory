# Video Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local-first, reusable HyperFrames TikTok video factory with scripted setup, compilation, checking, rendering, and cleanup.

**Architecture:** Durable templates, manifests, and asset metadata compile into disposable self-contained HyperFrames workspaces. Node.js standard-library scripts own the factory workflow; HyperFrames owns composition checking and rendering.

**Tech Stack:** Node.js 22 ESM, Node test runner, shell, HyperFrames CLI, FFmpeg/FFprobe, HTML/CSS/GSAP.

**Spec:** `docs/superpowers/specs/2026-11-24-video-factory-design.md`

## Global Constraints

- Store every artifact locally for now.
- Use Node.js 22 or newer and no runtime library beyond HyperFrames.
- Keep generated workspaces, frames, snapshots, caches, and renders out of Git.
- Keep `CLAUDE.md` and `AGENT.md` below 100 lines.
- Every repeated user workflow has a package script or shell script.

## Review Focus

- Invalid or missing episode fields fail before writing a workspace.
- Unknown asset IDs and paths escaping `library/` fail safely.
- Unresolved template placeholders fail compilation.
- Recompiling one episode replaces only its generated workspace.
- Setup checks report missing tools without modifying the machine in check mode.

---

### Task 1: Repository and factory core

**Files:**
- Create: `package.json`, `.gitignore`, `.hyperframesignore`
- Create: `scripts/lib/factory.mjs`
- Test: `test/factory.test.mjs`

**Interfaces:**
- Produces: `loadEpisode(path)`, `loadCatalog(root)`, `validateEpisode(value)`, `compileEpisode(options)`.

- [ ] Write failing Node tests for manifest validation, safe asset resolution, placeholder replacement, and stale workspace replacement.
- [ ] Run `npm test` and confirm the factory module is missing.
- [ ] Implement the minimal factory core with standard-library filesystem APIs.
- [ ] Run `npm test` and confirm all factory tests pass.

### Task 2: Reusable template and example episode

**Files:**
- Create: `templates/faceless-listicle/index.html`
- Create: `templates/faceless-listicle/compositions/{hook,content,cta}.html`
- Create: `templates/faceless-listicle/template.json`
- Create: `library/catalog.json`, `episodes/demo/episode.json`

**Interfaces:**
- Consumes: placeholder contract from `compileEpisode`.
- Produces: one valid 1080x1920, 30 fps example workspace.

- [ ] Add a compile integration test for the example episode.
- [ ] Create the smallest three-scene TikTok template with deterministic paused timelines.
- [ ] Compile the example and verify no placeholders remain.

### Task 3: Workflow CLIs

**Files:**
- Create: `scripts/{validate,compile,check,render,clean}.mjs`
- Test: `test/cli.test.mjs`

**Interfaces:**
- Consumes: factory core and project-local `hyperframes` executable.
- Produces: stable commands exposed through `package.json`.

- [ ] Write failing CLI tests for validation, compilation, and safe dry-run cleanup.
- [ ] Implement thin CLI wrappers with non-zero exits on failure.
- [ ] Run unit tests and compile the example episode.

### Task 4: Machine setup and documentation

**Files:**
- Create: `scripts/setup-machine.sh`
- Create: `README.md`, `CLAUDE.md`, `AGENT.md`

**Interfaces:**
- Produces: `--check` read-only diagnostics and explicit `--install` setup for macOS/Homebrew and Debian/Ubuntu.

- [ ] Implement setup checks for Node 22+, npm, FFmpeg, FFprobe, Git, and the local HyperFrames CLI.
- [ ] Implement explicit install mode and make the script executable.
- [ ] Document architecture, commands, storage, and extension workflow.
- [ ] Verify both agent files remain below 100 lines.

### Task 5: HyperFrames verification

**Files:**
- Modify only files identified by verification failures.

**Interfaces:**
- Consumes: compiled `workspaces/demo`.
- Produces: passing tests, HyperFrames lint/check, review snapshots, and a verified draft render.

- [ ] Run the complete test suite.
- [ ] Run setup check and example compilation.
- [ ] Run HyperFrames lint and `check --safe-zone tiktok` on the example workspace.
- [ ] Capture review snapshots and inspect them.
- [ ] Render a draft MP4 and verify resolution, duration, FPS, and non-empty output with ffprobe.
