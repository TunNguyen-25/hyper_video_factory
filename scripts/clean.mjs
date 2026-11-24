#!/usr/bin/env node
import { rm, stat } from "node:fs/promises";
import path from "node:path";

import { fail, option, projectRoot } from "./lib/cli.mjs";

async function exists(target) {
  return stat(target).then(() => true, () => false);
}

async function main() {
  const args = process.argv.slice(2);
  const root = path.resolve(option(args, "--root", projectRoot));
  const dryRun = args.includes("--dry-run");
  const confirmed = args.includes("--yes");
  if (!dryRun && !confirmed) throw new Error("Refusing to delete without --yes. Use --dry-run to inspect targets.");

  const targets = [
    path.join(root, "workspaces"),
    path.join(root, "artifacts"),
    path.join(root, "renders", "drafts"),
  ];
  for (const target of targets) {
    if (!await exists(target)) continue;
    process.stdout.write(`${dryRun ? "Would remove" : "Removing"}: ${target}\n`);
    if (!dryRun) await rm(target, { recursive: true, force: true });
  }
  if (dryRun) process.stdout.write("Dry run only; nothing was deleted.\n");
}

main().catch(fail);
