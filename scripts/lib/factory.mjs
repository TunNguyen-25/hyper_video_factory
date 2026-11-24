import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function readJson(filePath, label) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Cannot read ${label} at ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} at ${filePath}: ${error.message}`);
  }
}

export function validateEpisode(value) {
  assert(isRecord(value), "episode must be a JSON object");
  assert(ID_PATTERN.test(value.id ?? ""), "episode.id must use lowercase letters, numbers, and hyphens");
  assert(ID_PATTERN.test(value.template ?? ""), "episode.template must use lowercase letters, numbers, and hyphens");
  assert(Number.isFinite(value.duration) && value.duration >= 8, "episode.duration must be at least 8 seconds");
  assert(Number.isInteger(value.fps) && [24, 25, 30, 60].includes(value.fps), "episode.fps must be 24, 25, 30, or 60");
  assert(Number.isInteger(value.width) && value.width > 0, "episode.width must be a positive integer");
  assert(Number.isInteger(value.height) && value.height > 0, "episode.height must be a positive integer");
  assert(isRecord(value.content), "episode.content must be an object");
  for (const field of ["hook", "body", "cta"]) {
    assert(typeof value.content[field] === "string" && value.content[field].trim(), `episode.content.${field} is required`);
  }
  assert(isRecord(value.theme), "episode.theme must be an object");
  for (const field of ["background", "foreground", "accent"]) {
    assert(COLOR_PATTERN.test(value.theme[field] ?? ""), `episode.theme.${field} must be a six-digit hex color`);
  }
  assert(value.assets === undefined || isRecord(value.assets), "episode.assets must be an object when present");
  for (const [slot, assetId] of Object.entries(value.assets ?? {})) {
    assert(ID_PATTERN.test(slot), `episode asset slot '${slot}' is invalid`);
    assert(typeof assetId === "string" && assetId.length > 0, `episode.assets.${slot} must be an asset id`);
  }
  return value;
}

export async function loadEpisode(episodePath) {
  return validateEpisode(await readJson(episodePath, "episode manifest"));
}

export async function loadCatalog(root) {
  const catalog = await readJson(path.join(root, "library", "catalog.json"), "asset catalog");
  assert(isRecord(catalog), "asset catalog must be a JSON object");
  return catalog;
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function placeholderValues(episode, assetPaths) {
  const hookDuration = 3;
  const ctaDuration = 3;
  const contentStart = hookDuration;
  const ctaStart = episode.duration - ctaDuration;
  const values = {
    DURATION: episode.duration,
    FPS: episode.fps,
    WIDTH: episode.width,
    HEIGHT: episode.height,
    HOOK_DURATION: hookDuration,
    CONTENT_START: contentStart,
    CONTENT_DURATION: ctaStart - contentStart,
    CTA_START: ctaStart,
    CTA_DURATION: ctaDuration,
    HOOK: escapeHtml(episode.content.hook),
    BODY: escapeHtml(episode.content.body),
    CTA: escapeHtml(episode.content.cta),
    BACKGROUND: episode.theme.background,
    FOREGROUND: episode.theme.foreground,
    ACCENT: episode.theme.accent,
  };
  for (const [slot, assetPath] of Object.entries(assetPaths)) {
    values[`ASSET_${slot.toUpperCase().replaceAll("-", "_")}`] = assetPath;
  }
  return values;
}

async function replacePlaceholders(directory, values) {
  for (const filePath of await walkFiles(directory)) {
    if (!/[.](?:html|css|js|json)$/.test(filePath)) continue;
    let source = await readFile(filePath, "utf8");
    source = source.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
      if (!(key in values)) throw new Error(`Unresolved template placeholder ${key} in ${filePath}`);
      return String(values[key]);
    });
    await writeFile(filePath, source);
  }
}

async function stageAssets({ root, workspace, episode, catalog }) {
  const libraryRoot = path.resolve(root, "library");
  const assetRoot = path.join(workspace, "assets", "library");
  const staged = {};
  await mkdir(assetRoot, { recursive: true });

  for (const [slot, assetId] of Object.entries(episode.assets ?? {})) {
    const entry = catalog[assetId];
    assert(isRecord(entry) && typeof entry.path === "string", `Unknown asset id '${assetId}'`);
    const source = path.resolve(libraryRoot, entry.path);
    assert(inside(libraryRoot, source), `Asset '${assetId}' path escapes library`);
    const sourceStat = await stat(source).catch(() => null);
    assert(sourceStat?.isFile(), `Asset '${assetId}' file is missing: ${entry.path}`);
    const extension = path.extname(source);
    const destinationName = `${slot}${extension}`;
    await copyFile(source, path.join(assetRoot, destinationName));
    staged[slot] = `assets/library/${destinationName}`;
  }
  return staged;
}

export async function compileEpisode({ root = process.cwd(), episodePath, outputRoot } = {}) {
  assert(typeof episodePath === "string" && episodePath, "episodePath is required");
  const projectRoot = path.resolve(root);
  const episode = await loadEpisode(path.resolve(episodePath));
  const catalog = await loadCatalog(projectRoot);
  const templateRoot = path.join(projectRoot, "templates", episode.template);
  const templateStat = await stat(templateRoot).catch(() => null);
  assert(templateStat?.isDirectory(), `Template '${episode.template}' does not exist`);

  const workspaceRoot = path.resolve(outputRoot ?? path.join(projectRoot, "workspaces"));
  const target = path.join(workspaceRoot, episode.id);
  const temporary = path.join(workspaceRoot, `.${episode.id}-${process.pid}-${Date.now()}`);
  const backup = path.join(workspaceRoot, `.${episode.id}-backup-${process.pid}`);
  await mkdir(workspaceRoot, { recursive: true });
  await rm(temporary, { recursive: true, force: true });

  try {
    await cp(templateRoot, temporary, { recursive: true });
    const assets = await stageAssets({ root: projectRoot, workspace: temporary, episode, catalog });
    await replacePlaceholders(temporary, placeholderValues(episode, assets));
    await writeFile(
      path.join(temporary, "build-manifest.json"),
      `${JSON.stringify({ episode, assets, compiledAt: new Date().toISOString() }, null, 2)}\n`,
    );

    await rm(backup, { recursive: true, force: true });
    const targetExists = await stat(target).then(() => true, () => false);
    if (targetExists) await rename(target, backup);
    await rename(temporary, target);
    await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    const backupExists = await stat(backup).then(() => true, () => false);
    const targetExists = await stat(target).then(() => true, () => false);
    if (backupExists && !targetExists) await rename(backup, target);
    throw error;
  }

  return { id: episode.id, workspace: target, episode };
}
