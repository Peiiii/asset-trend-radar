#!/usr/bin/env node

import {
  collectCurrentGovernanceBacklog,
  formatFinding,
  loadGovernanceBaseline,
  makePathMap
} from "../shared/maintainability-governance-core.mjs";

const usage = `Usage:
  node scripts/governance/backlog/check-governance-backlog-ratchet.mjs
  node scripts/governance/backlog/check-governance-backlog-ratchet.mjs --json

Checks that maintainability backlog counts and adopted red-zone budgets do not
grow above the recorded baseline.`;

const parseArgs = (argv) => {
  const options = {
    json: false
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const evaluateMetricRatchet = ({ baseline, current }) => {
  const findings = [];

  for (const [metric, baselineValue] of Object.entries(baseline.metrics ?? {})) {
    const currentValue = current.metrics?.[metric];
    if (!Number.isFinite(currentValue)) {
      findings.push({
        level: "error",
        metric,
        message: `missing current metric ${metric}`
      });
      continue;
    }

    if (currentValue > baselineValue) {
      findings.push({
        level: "error",
        metric,
        message: `current count ${currentValue} exceeds baseline ${baselineValue}`
      });
      continue;
    }

    findings.push({
      level: "ok",
      metric,
      message: `current count ${currentValue} is within baseline ${baselineValue}`
    });
  }

  return findings;
};

const evaluateOversizedFileRatchet = ({ baseline, current }) => {
  const baselineFiles = makePathMap(baseline.oversizedSourceFiles ?? []);
  return current.oversizedSourceFiles
    .filter((entry) => {
      const baselineEntry = baselineFiles.get(entry.path);
      return !baselineEntry || entry.lines > baselineEntry.lines;
    })
    .map((entry) => {
      const baselineEntry = baselineFiles.get(entry.path);
      const suffix = baselineEntry ? `; adopted baseline is ${baselineEntry.lines}` : "; not present in baseline";
      return {
        level: "error",
        path: entry.path,
        message: `oversized file has ${entry.lines} lines${suffix}`
      };
    });
};

const evaluateDirectoryRatchet = ({ baseline, current }) => {
  const baselineDirectories = makePathMap(baseline.oversizedDirectories ?? []);
  return current.oversizedDirectories
    .filter((entry) => {
      const baselineEntry = baselineDirectories.get(entry.path);
      return !baselineEntry || entry.directSourceFiles > baselineEntry.directSourceFiles;
    })
    .map((entry) => {
      const baselineEntry = baselineDirectories.get(entry.path);
      const suffix = baselineEntry
        ? `; adopted baseline is ${baselineEntry.directSourceFiles}`
        : "; not present in baseline";
      return {
        level: "error",
        path: entry.path,
        message: `directory has ${entry.directSourceFiles} direct source files${suffix}`
      };
    });
};

const evaluateBacklogRatchet = ({ baseline, current }) => {
  const findings = [
    ...evaluateMetricRatchet({ baseline, current }),
    ...evaluateOversizedFileRatchet({ baseline, current }),
    ...evaluateDirectoryRatchet({ baseline, current })
  ];

  return {
    ok: findings.every((finding) => finding.level !== "error"),
    findings
  };
};

const printHuman = ({ baseline, current, evaluation }) => {
  console.log("Governance backlog ratchet");
  console.log(`- baseline date: ${baseline.updatedAt}`);

  for (const [metric, baselineValue] of Object.entries(baseline.metrics ?? {})) {
    console.log(`- ${metric}: ${current.metrics?.[metric]} (baseline ${baselineValue})`);
  }

  const errors = evaluation.findings.filter((finding) => finding.level === "error");
  if (errors.length === 0) {
    console.log("- status: OK");
    return;
  }

  console.error("- status: FAILED");
  for (const finding of errors) {
    console.error(`  - ${formatFinding(finding)}`);
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const baseline = loadGovernanceBaseline();
  const current = collectCurrentGovernanceBacklog();
  const evaluation = evaluateBacklogRatchet({ baseline, current });

  if (options.json) {
    console.log(JSON.stringify({ baseline, current, evaluation }, null, 2));
  } else {
    printHuman({ baseline, current, evaluation });
  }

  process.exit(evaluation.ok ? 0 : 1);
};

main();
