export const calculateEma = (values: number[], period: number): Array<number | null> => {
  if (values.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let previousEma: number | null = null;

  return values.map((value, index) => {
    if (index + 1 < period) {
      return null;
    }

    if (previousEma === null) {
      const seed = values.slice(index + 1 - period, index + 1);
      previousEma = seed.reduce((sum, item) => sum + item, 0) / period;
      return previousEma;
    }

    previousEma = (value - previousEma) * multiplier + previousEma;
    return previousEma;
  });
};
