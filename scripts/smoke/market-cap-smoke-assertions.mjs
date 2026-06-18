const getRawMarketCap = (item) =>
  item.valuation?.marketCap ?? item.valuation?.floatMarketCap ?? item.valuation?.fullyDilutedValuation ?? null;

const hasNasdaqMarketCap = (item) =>
  item.valuation?.source === "nasdaq" && getRawMarketCap(item) > 0;

const hasExplicitValuationGap = (item) =>
  item.valuation?.source === null && getRawMarketCap(item) === null;

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

const hasComparableMarketCap = (item) => getComparableMarketCap(item) !== null;

const assertOptionalNasdaqMarketCaps = (assert, items, message) => {
  assert(items.every((item) => hasNasdaqMarketCap(item) || hasExplicitValuationGap(item)), message);
  assert(items.some(hasNasdaqMarketCap) || items.some(hasExplicitValuationGap), message);
};

const assertSortedWhenComparable = (assert, isSortedDesc, items, message) => {
  const comparableItems = items.filter(hasComparableMarketCap);

  if (comparableItems.length > 1) {
    assert(isSortedDesc(comparableItems, getComparableMarketCap), message);
  }
};

export const fetchMarketCapSmokeData = async (fetchJson) => ({
  globalMarketCapWall: await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=market_cap&order=desc"),
  usMarketCapWall: await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E7%BE%8E%E8%82%A1&assetType=equity&sort=market_cap&order=desc"),
  usFundMarketCapWall: await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E7%BE%8E%E8%82%A1&assetType=fund&sort=market_cap&order=desc"),
  usEquityDirectoryMarketCapPage: await fetchJson("/api/directories/us-equity/items?status=all&sort=market_cap&order=desc&limit=20&offset=0"),
  usEquityDirectoryLocalEtfPage: await fetchJson("/api/directories/us-equity/items?keyword=QQQ&status=in_pool&sort=return_1m&order=desc&limit=10&offset=0"),
  commodityFundMarketCapWall: await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E5%95%86%E5%93%81&assetType=fund&sort=market_cap&order=desc"),
  commodityDirectoryMarketCapPage: await fetchJson("/api/directories/commodities/items?status=all&sort=market_cap&order=desc&limit=20&offset=0"),
  macroDirectoryMarketCapPage: await fetchJson("/api/directories/macro/items?status=all&sort=market_cap&order=desc&limit=20&offset=0")
});

export const assertMarketCapSmoke = ({ assert, isSortedDesc, globalMarketCapWall, usMarketCapWall, usFundMarketCapWall, usEquityDirectoryMarketCapPage, usEquityDirectoryLocalEtfPage, commodityFundMarketCapWall, commodityDirectoryMarketCapPage, macroDirectoryMarketCapPage }) => {
  assert(globalMarketCapWall.items.length >= 10, "expected global market-cap chart wall");
  assert(globalMarketCapWall.items.some((item) => item.valuation.currency === "CNY" && item.valuation.normalized?.currency === "USD"), "expected CNY market caps to include USD-normalized values");
  assert(isSortedDesc(globalMarketCapWall.items, getComparableMarketCap), "expected global market-cap sorting to use comparable USD values");
  assert(usMarketCapWall.items.length >= 6 && usMarketCapWall.items.every((item) => item.market === "美股" && item.assetType === "equity"), "expected US equity market-cap chart wall");
  assert(usMarketCapWall.items.every((item) => item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected US equity chart wall Nasdaq market-cap valuations");
  assert(usMarketCapWall.items.every((item) => item.valuation.normalized?.currency === "USD" && item.valuation.normalized.marketCap > 0), "expected US equity chart wall normalized market caps");
  assert(isSortedDesc(usMarketCapWall.items, getComparableMarketCap), "expected US equity chart wall market-cap sorting");
  assert(usFundMarketCapWall.items.length >= 5 && usFundMarketCapWall.items.every((item) => item.market === "美股" && item.assetType === "fund"), "expected US ETF market-cap chart wall");
  assertOptionalNasdaqMarketCaps(assert, usFundMarketCapWall.items, "expected US ETF chart wall to expose Nasdaq market caps or explicit valuation gaps");
  assertSortedWhenComparable(assert, isSortedDesc, usFundMarketCapWall.items, "expected US ETF chart wall market-cap sorting when comparable values are available");
  assert(usEquityDirectoryMarketCapPage.items.length >= 20, "expected US equity directory market-cap page");
  assert(usEquityDirectoryMarketCapPage.items.every((item) => item.valuation.source === "nasdaq" && item.valuation.marketCap > 0), "expected US equity directory Nasdaq market-cap valuations");
  assert(isSortedDesc(usEquityDirectoryMarketCapPage.items, (item) => item.valuation.marketCap), "expected US equity directory market-cap sorting");
  assert(
    usEquityDirectoryLocalEtfPage.items.some((item) => item.symbol === "QQQ" && item.poolState === "in_pool" && (hasNasdaqMarketCap(item) || hasExplicitValuationGap(item))),
    "expected in-pool US ETF directory rows to keep Nasdaq market-cap valuations or explicit valuation gaps outside market-cap sorting"
  );
  assert(commodityFundMarketCapWall.items.some((item) => item.symbol === "GLD" && (hasNasdaqMarketCap(item) || hasExplicitValuationGap(item))), "expected commodity ETF chart wall Nasdaq market-cap valuation or explicit valuation gap");
  assertSortedWhenComparable(assert, isSortedDesc, commodityFundMarketCapWall.items, "expected commodity ETF chart wall market-cap sorting when comparable values are available");
  assert(commodityDirectoryMarketCapPage.items.some((item) => item.symbol === "GLD" && (hasNasdaqMarketCap(item) || hasExplicitValuationGap(item))), "expected commodity directory Nasdaq market-cap valuation or explicit valuation gap");
  assertSortedWhenComparable(assert, isSortedDesc, commodityDirectoryMarketCapPage.items, "expected commodity directory market-cap sorting when comparable values are available");
  assert(macroDirectoryMarketCapPage.items.some((item) => item.symbol === "TLT" && (hasNasdaqMarketCap(item) || hasExplicitValuationGap(item))), "expected bond ETF directory Nasdaq market-cap valuation or explicit valuation gap");
  assertSortedWhenComparable(assert, isSortedDesc, macroDirectoryMarketCapPage.items, "expected macro directory market-cap sorting when comparable values are available");
};
