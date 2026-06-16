import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export class LocalRawFileRepository {
  public constructor(private readonly rawDataPath: string) {}

  public appendRecords = (vendor: string, dataset: string, symbol: string, records: unknown[]): void => {
    const date = new Date().toISOString().slice(0, 10);
    const directory = join(this.rawDataPath, `vendor=${vendor}`, `dataset=${dataset}`, `date=${date}`);
    mkdirSync(directory, { recursive: true });
    const filePath = join(directory, `${symbol}.jsonl`);
    const content = records.map((record) => JSON.stringify(record)).join("\n");
    appendFileSync(filePath, `${content}\n`);
  };
}
