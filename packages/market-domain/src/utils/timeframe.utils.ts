export const dayMs = 24 * 60 * 60 * 1000;

export const getRangePointLimit = (range: string): number => {
  switch (range) {
    case "1d":
      return 2;
    case "1w":
      return 8;
    case "1m":
      return 31;
    case "3m":
      return 93;
    case "6m":
      return 186;
    case "1y":
      return 365;
    case "3y":
      return 756;
    case "5y":
      return 1260;
    default:
      return 180;
  }
};

export const toIsoDateTime = (timestamp: number | null): string | null => {
  if (timestamp === null) {
    return null;
  }

  return new Date(timestamp).toISOString();
};
