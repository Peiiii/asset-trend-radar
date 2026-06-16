export const calculateSimpleMovingAverage = (values: number[], period: number): Array<number | null> => {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    const window = values.slice(index + 1 - period, index + 1);
    const total = window.reduce((sum, value) => sum + value, 0);
    return total / period;
  });
};
