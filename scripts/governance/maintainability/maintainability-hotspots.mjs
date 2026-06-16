#!/usr/bin/env node

import {
  collectCurrentGovernanceBacklog,
  countFileLines,
  listAllSourceFiles,
  maintainabilityPolicy
} from "../shared/maintainability-governance-core.mjs";

const usage = `Usage:
  node scripts/governance/maintainability/maintainability-hotspots.mjs
  node scripts/governance/maintainability/maintainability-hotspots.mjs --limit <n>
  node scripts/governance/maintainability/maintainability-hotspots.mjs --json

Prints the largest files and widest directories so refactors can start from the
highest-maintenance surfaces.`;

const parseArgs = (argv) => {
  const options = {
    json: false,
    limit: 12
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
    if (arg === "--limit") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      options.limit = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const collectLargestFiles = (limit) =>
  listAllSourceFiles()
    .map((repoPath) => ({
      path: repoPath,
      lines: countFileLines(repoPath)
    }))
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, limit);

const printHuman = ({ largestFiles, backlog }) => {
  console.log("Maintainability hotspots");
  console.log(`- source file hard limit: ${maintainabilityPolicy.sourceFileLineLimit} lines`);
  console.log(`- directory direct-file limit: ${maintainabilityPolicy.directoryFileLimit}`);

  console.log("\nLargest source files:");
  for (const entry of largestFiles) {
    const marker = entry.lines > maintainabilityPolicy.sourceFileLineLimit ? "RED" : "watch";
    console.log(`- [${marker}] ${entry.lines} ${entry.path}`);
  }

  console.log("\nOversized directories:");
  if (backlog.oversizedDirectories.length === 0) {
    console.log("- none");
  } else {
    for (const entry of backlog.oversizedDirectories) {
      console.log(`- ${entry.directSourceFiles} ${entry.path}`);
    }
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const largestFiles = collectLargestFiles(options.limit);
  const backlog = collectCurrentGovernanceBacklog();

  if (options.json) {
    console.log(JSON.stringify({ largestFiles, backlog }, null, 2));
    return;
  }

  printHuman({ largestFiles, backlog });
};

main();
