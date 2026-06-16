import { join } from "node:path";
import type { LocalRuntimeOptions } from "../types/local-runtime-options.types";

const toPositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const createLocalRuntimeOptionsFromEnv = (env: NodeJS.ProcessEnv = process.env): LocalRuntimeOptions => {
  const dataDir = env.GOLD_INSIGHTS_DATA_DIR ?? join(process.cwd(), ".gold-insights");

  return {
    host: env.GOLD_INSIGHTS_HOST ?? "127.0.0.1",
    port: toPositiveInteger(env.GOLD_INSIGHTS_PORT, 3193),
    dataDir,
    databasePath: env.GOLD_INSIGHTS_DATABASE_PATH ?? join(dataDir, "gold-insights.sqlite"),
    rawDataPath: env.GOLD_INSIGHTS_RAW_DATA_PATH ?? join(dataDir, "raw"),
    historyLimit: toPositiveInteger(env.GOLD_INSIGHTS_HISTORY_LIMIT, 1300),
    refreshOnStart: env.GOLD_INSIGHTS_REFRESH_ON_START !== "false"
  };
};
