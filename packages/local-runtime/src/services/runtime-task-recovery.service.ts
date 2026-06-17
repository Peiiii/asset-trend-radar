import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";

const interruptedTaskMessage = "runtime restarted before task finished";

export class RuntimeTaskRecoveryService {
  public constructor(private readonly ingestionJobRepository: SqliteIngestionJobRepository) {}

  public recoverInterruptedTasks = (): number => this.ingestionJobRepository.failRunningJobs(interruptedTaskMessage);
}
