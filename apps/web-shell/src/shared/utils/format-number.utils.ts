export const formatPrice = (value: number | null, currency: string): string => {
  if (value === null) {
    return "暂无";
  }

  const maximumFractionDigits = value > 100 ? 2 : value > 1 ? 4 : 6;
  return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${currency}`;
};

export const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};
