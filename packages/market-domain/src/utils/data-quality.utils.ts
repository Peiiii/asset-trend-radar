export type DataQualityStatus = "fresh" | "thin" | "lagged" | "missing" | "unknown";

export type DataQualityInput = {
  latestBarAt: string | null;
  dataPointCount: number;
};

export type DataQualityRule = {
  minimumPointCount: number;
  laggedAfterDays: number;
};

const defaultDataQualityRule: DataQualityRule = {
  minimumPointCount: 20,
  laggedAfterDays: 3
};

export function getDataQualityStatus(input: DataQualityInput, referenceTimestamp: number, rule: DataQualityRule = defaultDataQualityRule): DataQualityStatus {
  if (!input.latestBarAt || input.dataPointCount === 0) {
    return "missing";
  }

  if (input.dataPointCount < rule.minimumPointCount) {
    return "thin";
  }

  const latestTimestamp = Date.parse(input.latestBarAt);

  if (!Number.isFinite(latestTimestamp)) {
    return "unknown";
  }

  const ageDays = Math.max(0, (referenceTimestamp - latestTimestamp) / (24 * 60 * 60 * 1000));
  return ageDays > rule.laggedAfterDays ? "lagged" : "fresh";
}
