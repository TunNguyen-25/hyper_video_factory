import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileEpisode,
  loadCatalog,
  loadEpisode,
  validateEpisode,
} from "../scripts/lib/factory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "video-factory-"));
  await mkdir(path.join(root, "templates", "test", "compositions"), { recursive: true });
  await mkdir(path.join(root, "episodes", "demo"), { recursive: true });
  await mkdir(path.join(root, "library", "images"), { recursive: true });
  await writeFile(
    path.join(root, "templates", "test", "index.html"),
    '<main data-duration="{{DURATION}}">{{HOOK}}|{{ASSET_HERO}}</main>\n',
  );
  await writeFile(
    path.join(root, "templates", "test", "compositions", "scene.html"),
    "<template>{{BODY}}</template>\n",
  );
  await writeFile(path.join(root, "library", "images", "hero.svg"), "<svg/>\n");
  await writeFile(
    path.join(root, "library", "catalog.json"),
    JSON.stringify({
      "image.hero": { path: "images/hero.svg", type: "image", license: "owned" },
    }),
  );
  const episode = {
    id: "demo",
    template: "test",
    duration: 12,
    fps: 30,
    width: 1080,
    height: 1920,
    content: { hook: "Hook & win", body: "Useful body", cta: "Follow" },
    theme: { background: "#111111", foreground: "#ffffff", accent: "#ff3355" },
    assets: { hero: "image.hero" },
  };
  const episodePath = path.join(root, "episodes", "demo", "episode.json");
  await writeFile(episodePath, JSON.stringify(episode));
  return { root, episode, episodePath };
}

test("validateEpisode rejects a manifest without a stable id", () => {
  assert.throws(
    () => validateEpisode({ template: "test", duration: 12 }),
    /episode\.id/,
  );
});

test("loadEpisode and loadCatalog parse valid project JSON", async () => {
  const { root, episode, episodePath } = await fixture();
  assert.deepEqual(await loadEpisode(episodePath), episode);
  assert.equal((await loadCatalog(root))["image.hero"].path, "images/hero.svg");
});

test("compileEpisode stages referenced assets and replaces placeholders", async () => {
  const { root, episodePath } = await fixture();
  const result = await compileEpisode({ root, episodePath });

  assert.equal(result.id, "demo");
  assert.equal(result.workspace, path.join(root, "workspaces", "demo"));
  assert.equal(
    await readFile(path.join(result.workspace, "index.html"), "utf8"),
    '<main data-duration="12">Hook &amp; win|assets/library/hero.svg</main>\n',
  );
  assert.equal(
    await readFile(path.join(result.workspace, "compositions", "scene.html"), "utf8"),
    "<template>Useful body</template>\n",
  );
  assert.equal(
    await readFile(path.join(result.workspace, "assets", "library", "hero.svg"), "utf8"),
    "<svg/>\n",
  );
});

test("compileEpisode rejects catalog paths outside library", async () => {
  const { root, episodePath } = await fixture();
  await writeFile(
    path.join(root, "library", "catalog.json"),
    JSON.stringify({ "image.hero": { path: "../secret.txt", type: "image" } }),
  );

  await assert.rejects(() => compileEpisode({ root, episodePath }), /escapes library/);
});

test("compileEpisode replaces a stale workspace atomically", async () => {
  const { root, episodePath } = await fixture();
  const stale = path.join(root, "workspaces", "demo", "stale.txt");
  await mkdir(path.dirname(stale), { recursive: true });
  await writeFile(stale, "old");

  const result = await compileEpisode({ root, episodePath });
  await assert.rejects(() => readFile(stale, "utf8"), /ENOENT/);
  assert.equal(result.id, "demo");
});

test("compileEpisode fails when a template placeholder is unresolved", async () => {
  const { root, episodePath } = await fixture();
  await writeFile(
    path.join(root, "templates", "test", "index.html"),
    "{{HOOK}} {{UNKNOWN_VALUE}}\n",
  );

  await assert.rejects(() => compileEpisode({ root, episodePath }), /UNKNOWN_VALUE/);
});

test("the bundled demo compiles into a portrait three-scene workspace", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "video-factory-demo-"));
  const result = await compileEpisode({
    root: projectRoot,
    episodePath: path.join(projectRoot, "episodes", "demo", "episode.json"),
    outputRoot,
  });
  const index = await readFile(path.join(result.workspace, "index.html"), "utf8");
  assert.match(index, /data-width="1080"/);
  assert.match(index, /data-height="1920"/);
  assert.match(index, /data-fps="30"/);
  assert.equal((index.match(/data-composition-src=/g) ?? []).length, 3);
  assert.doesNotMatch(index, /\{\{[A-Z0-9_]+\}\}/);
});

test("the bundled demo passes HyperFrames structural lint", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "video-factory-lint-"));
  const result = await compileEpisode({
    root: projectRoot,
    episodePath: path.join(projectRoot, "episodes", "demo", "episode.json"),
    outputRoot,
  });
  const binary = path.join(projectRoot, "node_modules", ".bin", "hyperframes");
  const lint = spawnSync(binary, ["lint", result.workspace], { encoding: "utf8" });
  assert.equal(lint.status, 0, `${lint.stdout}\n${lint.stderr}`);
});
