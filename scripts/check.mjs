#!/usr/bin/env node
import path from "node:path";
import { mkdir } from "node:fs/promises";

import { compileEpisode } from "./lib/factory.mjs";
import { episodePath, fail, positional, projectRoot, runHyperframes } from "./lib/cli.mjs";

async function main() {
  const result = await compileEpisode({
    root: projectRoot,
    episodePath: episodePath(positional(process.argv.slice(2))),
  });
  const snapshotDirectory = path.join(projectRoot, "artifacts", result.id, "snapshots");
  await mkdir(snapshotDirectory, { recursive: true });
  await runHyperframes(["lint"], { cwd: result.workspace });
  await runHyperframes(["check", "--safe-zone", "tiktok", "--json"], { cwd: result.workspace });
  await runHyperframes(["snapshot", "--review", "--output", snapshotDirectory], { cwd: result.workspace });
  process.stdout.write(`Checked ${result.id}; snapshots: ${snapshotDirectory}\n`);
}

main().catch(fail);
