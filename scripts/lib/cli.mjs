import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function episodePath(argument = "demo", root = projectRoot) {
  if (argument.endsWith(".json") || argument.includes(path.sep)) return path.resolve(argument);
  return path.join(root, "episodes", argument, "episode.json");
}

export function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

export function positional(args, fallback = "demo") {
  return args.find((value, index) => !value.startsWith("--") && (index === 0 || !args[index - 1].startsWith("--"))) ?? fallback;
}

export function fail(error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}

export function defaultRenderOutput(root, id, quality) {
  const lifecycle = quality === "delivery" ? "final" : "drafts";
  return path.join(root, "renders", lifecycle, id, `${id}-${quality}.mp4`);
}

export async function runHyperframes(args, { cwd, root = projectRoot } = {}) {
  const binary = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "hyperframes.cmd" : "hyperframes");
  await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, stdio: "inherit" });
    child.once("error", (error) => {
      if (error.code === "ENOENT") reject(new Error("HyperFrames CLI is not installed. Run npm run setup:install."));
      else reject(error);
    });
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`HyperFrames exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}
