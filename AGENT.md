# Agent guide

1. Read `README.md` and the target episode before editing.
2. Treat templates, manifests, scripts, and catalog metadata as source.
3. Treat `workspaces/`, `artifacts/`, and `renders/` as generated local output.
4. Never remove `.hyperframes/` wholesale.
5. Use the project-local HyperFrames CLI through the npm scripts.
6. Put reusable motion in templates or components, not an episode workspace.
7. Put reusable media in `library/` and reference it through `catalog.json`.
8. Do not reference files outside `library/` from an episode.
9. Use test-first changes for compiler and workflow behavior.
10. Run `npm test` before reporting completion.
11. Run `npm run check -- <episode-id>` after composition changes.
12. Keep compositions deterministic and safe for 1080x1920 TikTok output.
13. Do not commit caches, media outputs, secrets, snapshots, or raw frames.
