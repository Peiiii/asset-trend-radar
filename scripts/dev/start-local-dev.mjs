#!/usr/bin/env node
import { spawn } from "node:child_process";
import readline from "node:readline";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const webPort = process.env.GOLD_INSIGHTS_WEB_PORT ?? "5193";
const runtimePort = process.env.GOLD_INSIGHTS_PORT ?? "3193";

const processes = [
  {
    label: "runtime",
    args: ["dev:runtime"],
    env: {
      ...process.env,
      GOLD_INSIGHTS_PORT: runtimePort
    }
  },
  {
    label: "web",
    args: ["dev:web"],
    env: {
      ...process.env,
      GOLD_INSIGHTS_PORT: runtimePort,
      GOLD_INSIGHTS_WEB_PORT: webPort
    }
  }
];

const children = new Map();
let shuttingDown = false;
let requestedExitCode = 0;

console.log(`Gold Insights dev starting`);
console.log(`Runtime: http://127.0.0.1:${runtimePort}`);
console.log(`Web:     http://127.0.0.1:${webPort}`);

for (const processConfig of processes) {
  startProcess(processConfig);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

function startProcess(processConfig) {
  const child = spawn(pnpmCommand, processConfig.args, {
    cwd: process.cwd(),
    env: processConfig.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.set(processConfig.label, child);
  prefixStream(processConfig.label, child.stdout);
  prefixStream(processConfig.label, child.stderr);

  child.on("exit", (code, signal) => {
    children.delete(processConfig.label);

    if (shuttingDown) {
      finishWhenStopped();
      return;
    }

    requestedExitCode = code ?? (signal ? 1 : 0);
    console.error(`[dev] ${processConfig.label} exited with ${signal ?? code}`);
    stopAll(requestedExitCode);
  });

  child.on("error", (error) => {
    children.delete(processConfig.label);
    requestedExitCode = 1;
    console.error(`[dev] failed to start ${processConfig.label}: ${error.message}`);
    stopAll(requestedExitCode);
  });
}

function prefixStream(label, stream) {
  const lines = readline.createInterface({ input: stream });

  lines.on("line", (line) => {
    console.log(`[${label}] ${line}`);
  });
}

function stopAll(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  requestedExitCode = exitCode;

  for (const child of children.values()) {
    child.kill("SIGTERM");
  }

  finishWhenStopped();
}

function finishWhenStopped() {
  if (children.size === 0) {
    process.exit(requestedExitCode);
  }
}
