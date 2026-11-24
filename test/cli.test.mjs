import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { defaultRenderOutput } from "../scripts/lib/cli.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(root, "scripts", script), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("validate CLI accepts an episode id", () => {
  const result = run("validate.mjs", ["demo"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid episode: demo/);
});

test("validate CLI returns non-zero for an invalid manifest", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "video-factory-invalid-"));
  const manifest = path.join(directory, "episode.json");
  await writeFile(manifest, JSON.stringify({ id: "Bad ID" }));
  const result = run("validate.mjs", [manifest]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /episode\.id/);
});

test("compile CLI writes to an explicit output root", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "video-factory-cli-"));
  const result = run("compile.mjs", ["demo", "--output", outputRoot]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Compiled demo/);
  assert.match(await readFile(path.join(outputRoot, "demo", "index.html"), "utf8"), /data-composition-id="main"/);
});

test("clean CLI dry-run lists generated targets without deleting them", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "video-factory-clean-"));
  const generated = path.join(project, "workspaces", "demo", "marker.txt");
  const final = path.join(project, "renders", "final", "keep.mp4");
  await mkdir(path.dirname(generated), { recursive: true });
  await mkdir(path.dirname(final), { recursive: true });
  await writeFile(generated, "generated");
  await writeFile(final, "keep");

  const result = run("clean.mjs", ["--dry-run", "--root", project]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /workspaces/);
  assert.equal(await readFile(generated, "utf8"), "generated");
  assert.equal(await readFile(final, "utf8"), "keep");
});

test("default render paths separate disposable drafts from durable finals", () => {
  assert.equal(
    defaultRenderOutput("/factory", "demo", "draft"),
    path.join("/factory", "renders", "drafts", "demo", "demo-draft.mp4"),
  );
  assert.equal(
    defaultRenderOutput("/factory", "demo", "delivery"),
    path.join("/factory", "renders", "final", "demo", "demo-delivery.mp4"),
  );
});

test("clean CLI removes disposable output but preserves final renders", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "video-factory-clean-confirmed-"));
  const workspace = path.join(project, "workspaces", "demo", "marker.txt");
  const draft = path.join(project, "renders", "drafts", "demo", "draft.mp4");
  const final = path.join(project, "renders", "final", "demo", "final.mp4");
  for (const file of [workspace, draft, final]) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, file);
  }

  const result = run("clean.mjs", ["--yes", "--root", project]);
  assert.equal(result.status, 0, result.stderr);
  await assert.rejects(() => readFile(workspace, "utf8"), /ENOENT/);
  await assert.rejects(() => readFile(draft, "utf8"), /ENOENT/);
  assert.equal(await readFile(final, "utf8"), final);
});
