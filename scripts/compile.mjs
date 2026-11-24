#!/usr/bin/env node
import { compileEpisode } from "./lib/factory.mjs";
import { episodePath, fail, option, positional, projectRoot } from "./lib/cli.mjs";

async function main() {
  const args = process.argv.slice(2);
  const result = await compileEpisode({
    root: projectRoot,
    episodePath: episodePath(positional(args)),
    outputRoot: option(args, "--output", undefined),
  });
  process.stdout.write(`Compiled ${result.id} -> ${result.workspace}\n`);
}

main().catch(fail);
