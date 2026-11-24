#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { compileEpisode } from "./lib/factory.mjs";
import { defaultRenderOutput, episodePath, fail, option, positional, projectRoot, runHyperframes } from "./lib/cli.mjs";

async function main() {
  const args = process.argv.slice(2);
  const quality = option(args, "--quality", "draft");
  if (!["draft", "looks", "delivery"].includes(quality)) throw new Error("--quality must be draft, looks, or delivery");
  const result = await compileEpisode({
    root: projectRoot,
    episodePath: episodePath(positional(args)),
  });
  const output = path.resolve(option(args, "--output", defaultRenderOutput(projectRoot, result.id, quality)));
  await mkdir(path.dirname(output), { recursive: true });
  await runHyperframes(["lint"], { cwd: result.workspace });
  await runHyperframes(["check", "--safe-zone", "tiktok", "--json", "--no-craft"], { cwd: result.workspace });
  await runHyperframes(["render", "--quality", quality, "--output", output], { cwd: result.workspace });
  process.stdout.write(`Rendered ${result.id} -> ${output}\n`);
}

main().catch(fail);
