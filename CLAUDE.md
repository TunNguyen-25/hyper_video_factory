# Project instructions

- This repository is a local-first HyperFrames TikTok video factory.
- Read `README.md` before changing workflows or storage paths.
- Durable source lives in `templates/`, `episodes/`, `library/`, and `scripts/`.
- Generated output lives in `workspaces/`, `artifacts/`, and `renders/`; never commit it.
- Do not delete `.hyperframes/` wholesale because it may contain history.
- Use Node.js 22+ and the project-local HyperFrames CLI.
- Prefer Node.js standard library over adding dependencies.
- Repeated operations belong in scripts, not undocumented command sequences.
- Add or change tests before changing factory behavior.
- Run `npm test` after code changes.
- Run `npm run check -- <episode-id>` after template changes.
- Keep HyperFrames clips deterministic: no timers, network fetches, or unseeded randomness.
- Keep TikTok compositions at 1080x1920 unless the episode explicitly requires otherwise.
- Keep important text and subjects inside the TikTok safe zone.
- Never commit secrets, generated video, raw frames, or large media binaries.
