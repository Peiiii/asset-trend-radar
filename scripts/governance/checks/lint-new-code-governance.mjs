#!/usr/bin/env node

import path from "node:path";

import {
  collectChangedFiles,
  collectPackageDeepImportViolations,
  collectSourceFileNameViolations,
  countFileLines,
  formatFinding,
  isSourceFile,
  loadGovernanceBaseline,
  maintainabilityPolicy,
  makePathMap
} from "../shared/maintainability-governance-core.mjs";

const usage = `Usage:
  node scripts/governance/checks/lint-new-code-governance.mjs
  node scripts/governance/checks/lint-new-code-governance.mjs --files <paths...>
  node scripts/governance/checks/lint-new-code-governance.mjs --json [--files <paths...>]

Runs maintainability checks against changed files. Existing debt listed in the
baseline is allowed only while it stays at or below the adopted baseline.`;

const parseArgs = (argv) => {
  const options = {
    files: [],
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--files") {
      options.files.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    options.files.push(arg);
  }

  return options;
};

const isCodeFile = (repoPath) => isSourceFile(repoPath);

const collectSizeFindings = ({ files, baseline }) => {
  const baselineFiles = makePathMap(baseline.oversizedSourceFiles ?? []);
  const findings = [];

  for (const repoPath of files.filter(isCodeFile)) {
    const lines = countFileLines(repoPath);
    const baselineEntry = baselineFiles.get(repoPath);

    if (lines > maintainabilityPolicy.sourceFileLineLimit) {
      if (baselineEntry && lines <= baselineEntry.lines) {
        findings.push({
          level: "warning",
          path: repoPath,
          message: `file has ${lines} lines; within adopted oversized baseline ${baselineEntry.lines}`
        });
        continue;
      }

      const baselineNote = baselineEntry ? ` and exceeds adopted baseline ${baselineEntry.lines}` : "";
      findings.push({
        level: "error",
        path: repoPath,
        message: `file has ${lines} lines, above limit ${maintainabilityPolicy.sourceFileLineLimit}${baselineNote}`
      });
      continue;
    }

    if (lines > maintainabilityPolicy.sourceFileWarningLimit) {
      findings.push({
        level: "warning",
        path: repoPath,
        message: `file has ${lines} lines and is nearing limit ${maintainabilityPolicy.sourceFileLineLimit}`
      });
    }
  }

  return findings;
};

const collectDirectoryFindings = ({ files, baseline }) => {
  const baselineDirectories = makePathMap(baseline.oversizedDirectories ?? []);
  const touchedDirectories = new Set(files.filter(isCodeFile).map((repoPath) => path.dirname(repoPath)));
  const findings = [];

  for (const dirPath of touchedDirectories) {
    const baselineEntry = baselineDirectories.get(dirPath);
    if (!baselineEntry) {
      continue;
    }

    findings.push({
      level: "warning",
      path: dirPath,
      message: `directory has adopted budget ${baselineEntry.directSourceFiles}; split before adding more peer files`
    });
  }

  return findings;
};

const collectImportFindings = (files) =>
  collectPackageDeepImportViolations(files).map((finding) => ({
    level: "error",
    path: finding.path,
    message: `${finding.importPath} deep-imports another workspace package; use its public package root`
  }));

const collectNameFindings = (files) =>
  collectSourceFileNameViolations(files).map((finding) => ({
    level: "error",
    path: finding.path,
    message: finding.message
  }));

const printHuman = ({ files, findings }) => {
  console.log("New-code governance");
  console.log(`- checked files: ${files.length}`);

  if (files.length === 0) {
    console.log("- status: OK (no changed source files)");
    return;
  }

  const errors = findings.filter((finding) => finding.level === "error");
  const warnings = findings.filter((finding) => finding.level === "warning");

  if (warnings.length > 0) {
    console.log("- warnings:");
    for (const finding of warnings) {
      console.log(`  - ${formatFinding(finding)}`);
    }
  }

  if (errors.length > 0) {
    console.error("- status: FAILED");
    for (const finding of errors) {
      console.error(`  - ${formatFinding(finding)}`);
    }
    return;
  }

  console.log("- status: OK");
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const baseline = loadGovernanceBaseline();
  const files = collectChangedFiles(options.files).filter(isCodeFile);
  const findings = [
    ...collectNameFindings(files),
    ...collectImportFindings(files),
    ...collectSizeFindings({ files, baseline }),
    ...collectDirectoryFindings({ files, baseline })
  ];
  const ok = findings.every((finding) => finding.level !== "error");

  if (options.json) {
    console.log(JSON.stringify({ ok, files, findings }, null, 2));
  } else {
    printHuman({ files, findings });
  }

  process.exit(ok ? 0 : 1);
};

main();
