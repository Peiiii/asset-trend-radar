export type LocalRuntimeOptions = {
  host: string;
  port: number;
  dataDir: string;
  databasePath: string;
  rawDataPath: string;
  historyLimit: number;
  refreshOnStart: boolean;
};

export type LocalRuntimeStartResult = {
  url: string;
  databasePath: string;
  rawDataPath: string;
};
