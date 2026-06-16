import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptDir, "../../..");

export const maintainabilityPolicy = {
  sourceFileLineLimit: 360,
  sourceFileWarningLimit: 280,
  directoryFileLimit: 12
};

export const sourceRoots = ["apps", "packages", "scripts"];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css"]);
const ignoredPathParts = new Set(["node_modules", "dist", "coverage", ".next", "ui-dist"]);
const fileNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.[a-z0-9]+$/;
const packageDeepImportPattern =
  /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])(@gold-insights\/[^/"']+\/[^"']+)["']/g;

export const toRepoPath = (filePath) =>
  path.relative(repoRoot, path.resolve(repoRoot, filePath)).split(path.sep).join("/");

export const resolveRepoPath = (repoPath) => path.resolve(repoRoot, repoPath);

export const isIgnoredPath = (repoPath) =>
  repoPath.split("/").some((part) => ignoredPathParts.has(part));

export const isSourceFile = (repoPath) =>
  sourceExtensions.has(path.extname(repoPath)) && !isIgnoredPath(repoPath);

export const isTestFile = (repoPath) =>
  /(?:^|\/)(?:__tests__|tests)\//.test(repoPath) || /\.(?:test|spec)\.[^.]+$/.test(repoPath);

export const countTextLines = (text) => {
  if (text.length === 0) {
    return 0;
  }
  const lines = text.split(/\r?\n/).length;
  return text.endsWith("\n") ? lines - 1 : lines;
};

export const readTextFile = (repoPath) => fs.readFileSync(resolveRepoPath(repoPath), "utf8");

export const countFileLines = (repoPath) => countTextLines(readTextFile(repoPath));

const runGit = (args) => {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout.split(/\r?\n/).filter(Boolean);
};

const walkFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const repoPath = toRepoPath(fullPath);
    if (entry.isDirectory()) {
      if (!isIgnoredPath(repoPath)) {
        files.push(...walkFiles(fullPath));
      }
      continue;
    }
    if (entry.isFile() && isSourceFile(repoPath)) {
      files.push(repoPath);
    }
  }
  return files;
};

export const listAllSourceFiles = () =>
  sourceRoots.flatMap((rootName) => walkFiles(path.join(repoRoot, rootName))).sort();

export const collectChangedFiles = (explicitFiles = []) => {
  const files = new Set();
  const addFile = (filePath) => {
    const repoPath = toRepoPath(filePath);
    if (repoPath.startsWith("..") || path.isAbsolute(repoPath)) {
      return;
    }
    if (fs.existsSync(resolveRepoPath(repoPath))) {
      files.add(repoPath);
    }
  };

  if (explicitFiles.length > 0) {
    for (const filePath of explicitFiles) {
      addFile(filePath);
    }
    return [...files].sort();
  }

  for (const filePath of runGit(["diff", "--name-only", "--diff-filter=AMR", "HEAD", "--", ...sourceRoots])) {
    addFile(filePath);
  }
  for (const filePath of runGit(["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots])) {
    addFile(filePath);
  }
  return [...files].sort();
};

export const collectSourceFileNameViolations = (files = listAllSourceFiles()) =>
  files
    .filter((repoPath) => isSourceFile(repoPath))
    .filter((repoPath) => !fileNamePattern.test(path.basename(repoPath)))
    .map((repoPath) => ({
      path: repoPath,
      message: "source files must use lowercase kebab-case names with optional role suffixes"
    }));

export const collectPackageDeepImportViolations = (files = listAllSourceFiles()) => {
  const findings = [];

  for (const repoPath of files.filter((filePath) => isSourceFile(filePath) && path.extname(filePath) !== ".css")) {
    const text = readTextFile(repoPath);
    for (const match of text.matchAll(packageDeepImportPattern)) {
      findings.push({
        path: repoPath,
        importPath: match[1],
        message: "workspace packages must be imported through their public package root"
      });
    }
  }

  return findings;
};

export const collectOversizedSourceFiles = (files = listAllSourceFiles()) =>
  files
    .filter((repoPath) => isSourceFile(repoPath) && !isTestFile(repoPath))
    .map((repoPath) => ({
      path: repoPath,
      lines: countFileLines(repoPath)
    }))
    .filter((entry) => entry.lines > maintainabilityPolicy.sourceFileLineLimit)
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));

export const collectDirectoryBudgets = (files = listAllSourceFiles()) => {
  const counts = new Map();

  for (const repoPath of files.filter((filePath) => isSourceFile(filePath) && !isTestFile(filePath))) {
    const dirPath = path.dirname(repoPath);
    counts.set(dirPath, (counts.get(dirPath) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([dirPath, directSourceFiles]) => ({ path: dirPath, directSourceFiles }))
    .filter((entry) => entry.directSourceFiles > maintainabilityPolicy.directoryFileLimit)
    .sort((a, b) => b.directSourceFiles - a.directSourceFiles || a.path.localeCompare(b.path));
};

export const collectCurrentGovernanceBacklog = () => {
  const files = listAllSourceFiles();
  const oversizedSourceFiles = collectOversizedSourceFiles(files);
  const oversizedDirectories = collectDirectoryBudgets(files);
  const packageDeepImportViolations = collectPackageDeepImportViolations(files);
  const sourceFileNameViolations = collectSourceFileNameViolations(files);

  return {
    metrics: {
      oversizedSourceFiles: oversizedSourceFiles.length,
      oversizedDirectories: oversizedDirectories.length,
      packageDeepImportViolations: packageDeepImportViolations.length,
      sourceFileNameViolations: sourceFileNameViolations.length
    },
    oversizedSourceFiles,
    oversizedDirectories,
    packageDeepImportViolations,
    sourceFileNameViolations
  };
};

export const loadGovernanceBaseline = () => {
  const baselinePath = "scripts/governance/backlog/governance-backlog-baseline.json";
  return JSON.parse(readTextFile(baselinePath));
};

export const makePathMap = (entries) => new Map(entries.map((entry) => [entry.path, entry]));

export const formatFinding = (finding) => {
  const location = finding.path ? `${finding.path}: ` : "";
  return `${location}${finding.message}`;
};
