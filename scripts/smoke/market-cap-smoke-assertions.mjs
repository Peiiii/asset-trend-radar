const getRawMarketCap = (item) =>
  item.valuation?.marketCap ?? item.valuation?.floatMarketCap ?? item.valuation?.fullyDilutedValuation ?? null;

const isUsdLikeCurrency = (currency) => {
  const normalizedCurrency = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  return normalizedCurrency === "USD" || normalizedCurrency === "USDT" || normalizedCurrency === "USDC";
};

export const getComparableMarketCap = (item) => {
  const normalizedValue = item.valuation?.normalized?.marketCap ?? item.valuation?.normalized?.floatMarketCap ?? item.valuation?.normalized?.fullyDilutedValuation ?? null;

  if (normalizedValue !== null) {
    return normalizedValue;
  }

  return isUsdLikeCurrency(item.valuation?.currency) ? getRawMarketCap(item) : null;
};

export const assertMarketCapSmoke = ({ assert, isSortedDesc, globalMarketCapWall, usMarketCapWall, usFundMarketCapWall, commodityFundMarketCapWall, commodityDirectoryMarketCapPage, macroDirectoryMarketCapPage }) => {
  assert(globalMarketCapWall.items.length >= 10, "expected global market-cap chart wall");
  assert(globalMarketCapWall.items.some((item) => item.valuation.currency === "CNY" && item.valuation.normalized?.currency === "USD"), "expected CNY market caps to include USD-normalized values");
  assert(isSortedDesc(globalMarketCapWall.items, getComparableMarketCap), "expected global market-cap sorting to use comparable USD values");
  assert(usMarketCapWall.items.length >= 6 && usMarketCapWall.items.every((item) => item.market === "美股" && item.assetType === "equity"), "expected US equity market-cap chart wall");
  assert(usMarketCapWall.items.every((item) => item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected US equity chart wall Nasdaq market-cap valuations");
  assert(usMarketCapWall.items.every((item) => item.valuation.normalized?.currency === "USD" && item.valuation.normalized.marketCap > 0), "expected US equity chart wall normalized market caps");
  assert(isSortedDesc(usMarketCapWall.items, getComparableMarketCap), "expected US equity chart wall market-cap sorting");
  assert(usFundMarketCapWall.items.length >= 5 && usFundMarketCapWall.items.every((item) => item.market === "美股" && item.assetType === "fund"), "expected US ETF market-cap chart wall");
  assert(usFundMarketCapWall.items.every((item) => item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected US ETF chart wall Nasdaq market-cap valuations");
  assert(usFundMarketCapWall.items.every((item) => item.valuation.normalized?.currency === "USD" && item.valuation.normalized.marketCap > 0), "expected US ETF chart wall normalized market caps");
  assert(isSortedDesc(usFundMarketCapWall.items, getComparableMarketCap), "expected US ETF chart wall market-cap sorting");
  assert(commodityFundMarketCapWall.items.some((item) => item.symbol === "GLD" && item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected commodity ETF chart wall Nasdaq market-cap valuation");
  assert(isSortedDesc(commodityFundMarketCapWall.items, getComparableMarketCap), "expected commodity ETF chart wall market-cap sorting");
  assert(commodityDirectoryMarketCapPage.items.some((item) => item.symbol === "GLD" && item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected commodity directory Nasdaq market-cap valuations");
  assert(isSortedDesc(commodityDirectoryMarketCapPage.items, getComparableMarketCap), "expected commodity directory market-cap sorting");
  assert(macroDirectoryMarketCapPage.items.some((item) => item.symbol === "TLT" && item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected bond ETF directory Nasdaq market-cap valuations");
  assert(isSortedDesc(macroDirectoryMarketCapPage.items, getComparableMarketCap), "expected macro directory market-cap sorting");
};
