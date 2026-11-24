import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("setup check reports every required tool without installing", () => {
  const result = spawnSync("bash", [path.join(root, "scripts", "setup-machine.sh"), "--check"], {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout}${result.stderr}`;
  for (const label of ["Node.js", "npm", "FFmpeg", "FFprobe", "Git", "HyperFrames CLI"]) {
    assert.match(output, new RegExp(label.replace(".", "\\.")));
  }
  assert.doesNotMatch(output, /Installing system packages/);
});
