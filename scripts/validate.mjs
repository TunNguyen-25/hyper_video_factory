#!/usr/bin/env node
import { loadCatalog, loadEpisode } from "./lib/factory.mjs";
import { episodePath, fail, positional, projectRoot } from "./lib/cli.mjs";

async function main() {
  const episode = await loadEpisode(episodePath(positional(process.argv.slice(2))));
  const catalog = await loadCatalog(projectRoot);
  for (const assetId of Object.values(episode.assets ?? {})) {
    if (!catalog[assetId]) throw new Error(`Unknown asset id '${assetId}'`);
  }
  process.stdout.write(`Valid episode: ${episode.id}\n`);
}

main().catch(fail);
