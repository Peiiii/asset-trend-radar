import { LocalRuntimeService } from "@gold-insights/local-runtime";
import { localShellRuntimeOptions } from "./configs/local-shell.config";

const runtime = new LocalRuntimeService(localShellRuntimeOptions);

const stop = async (): Promise<void> => {
  await runtime.stop();
};

process.on("SIGINT", () => {
  void stop().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void stop().finally(() => process.exit(0));
});

void runtime
  .start()
  .then((result) => {
    console.log(`Gold Insights local runtime listening at ${result.url}`);
    console.log(`SQLite database: ${result.databasePath}`);
    console.log(`Raw data: ${result.rawDataPath}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
