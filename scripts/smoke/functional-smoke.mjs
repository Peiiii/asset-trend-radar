import { rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const dataDir = join(rootDir, ".tmp", "functional-smoke-data");
const port = 3293;
const baseUrl = `http://127.0.0.1:${port}`;
const logs = [];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fetchJson = async (path, init) => {
  const response = await fetch(`${baseUrl}${path}`, init);

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json();
};

const isSortedDesc = (items, getValue) => {
  const values = items.map(getValue).filter((value) => typeof value === "number" && Number.isFinite(value));
  return values.every((value, index) => index === 0 || values[index - 1] >= value);
};

const waitForRuntime = async () => {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < 420000) {
    try {
      const health = await fetchJson("/api/data-health");
      const hasDailyBars = health.barsByTimeframe?.some((row) => row.timeframe === "1d" && row.count >= 80 * 1000);
      const hasEastmoneyBars = health.barsBySource?.some((row) => row.source === "eastmoney" && row.count >= 40 * 700);
      if (health.latestJob?.status === "success" && health.barCount >= 45 * 1000 && hasDailyBars && hasEastmoneyBars) {
        return health;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("unknown runtime readiness error");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error(`runtime did not become ready${lastError ? `: ${lastError.message}` : ""}\n${logs.join("")}`);
};

const stopProcess = async (child) => {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 5000);
  });
};

rmSync(dataDir, { force: true, recursive: true });

const child = spawn("pnpm", ["dev:runtime"], {
  cwd: rootDir,
  env: {
    ...process.env,
    GOLD_INSIGHTS_DATA_DIR: dataDir,
    GOLD_INSIGHTS_PORT: String(port),
    GOLD_INSIGHTS_HISTORY_LIMIT: "1300",
    GOLD_INSIGHTS_REFRESH_ON_START: "true"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

child.stdout.on("data", (chunk) => {
  logs.push(chunk.toString());
});

child.stderr.on("data", (chunk) => {
  logs.push(chunk.toString());
});

try {
  const initialHealth = await waitForRuntime();
  const chartWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const aShareWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=A%20%E8%82%A1&assetType=all&sort=trend_score");
  const fundWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=fund&sort=return_1m");
  const commodityWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E5%95%86%E5%93%81&assetType=all&sort=volume_ratio");
  const sortedReturnWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=return_1m");
  const sortedVolumeWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=volume_ratio");
  const weeklyWall = await fetchJson("/api/chart-wall?range=1y&timeframe=1w&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const monthlyWall = await fetchJson("/api/chart-wall?range=5y&timeframe=1mo&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const fifteenMinuteWall = await fetchJson("/api/chart-wall?range=1m&timeframe=15m&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const oneHourWall = await fetchJson("/api/chart-wall?range=1m&timeframe=1h&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const fourHourWall = await fetchJson("/api/chart-wall?range=1m&timeframe=4h&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const assetDetail = await fetchJson("/api/assets/us-nvda");
  const assetBars = await fetchJson("/api/assets/us-nvda/bars?range=3m&timeframe=1d");
  const assetIndicators = await fetchJson("/api/assets/us-nvda/indicators?range=3m&timeframe=1d");
  const mutualFundBars = await fetchJson("/api/assets/fund-cn-005827/bars?range=1y&timeframe=1d");
  const scannerEvents = await fetchJson("/api/scanner/events?universe=global&eventType=all");
  const compare = await fetchJson("/api/compare?assetIds=us-nvda,cn-csi300,cmd-gold,btcusdt&range=6m&timeframe=1d");
  const universeTree = await fetchJson("/api/universe/tree");
  await fetchJson("/api/watchlists/default/assets", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ assetId: "us-nvda" })
  });
  const watchlists = await fetchJson("/api/watchlists");
  const pinnedWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&signal=pinned&sort=trend_score");
  await fetchJson("/api/refresh", { method: "POST" });
  const finalHealth = await fetchJson("/api/data-health");
  const markets = new Set(chartWall.items.map((item) => item.market));
  const assetTypes = new Set(chartWall.items.map((item) => item.assetType));
  const levels = new Set(chartWall.items.map((item) => item.level));

  assert(initialHealth.assetCount >= 125, "expected full asset universe with hierarchy nodes and expanded funds");
  assert(initialHealth.barCount >= 45 * 1000, "expected multi-asset startup ingestion to persist full daily history and intraday bars");
  assert(initialHealth.latestBarAt !== null, "expected latest bar timestamp");
  assert(initialHealth.lastIngestionAt !== null, "expected ingestion timestamp");
  assert(initialHealth.rawFileCount > 0, "expected raw JSONL files");
  assert(initialHealth.databaseSizeBytes > 0, "expected non-empty SQLite database");
  assert(initialHealth.barsByTimeframe.some((row) => row.timeframe === "1d" && row.count > 0), "expected daily bar health");
  assert(initialHealth.barsByTimeframe.some((row) => row.timeframe === "15m" && row.count > 0), "expected 15m bar health");
  assert(initialHealth.barsByTimeframe.some((row) => row.timeframe === "1h" && row.count > 0), "expected 1h bar health");
  assert(initialHealth.barsByTimeframe.some((row) => row.timeframe === "4h" && row.count > 0), "expected 4h bar health");
  assert(initialHealth.barsBySource.some((row) => row.source === "yahoo" && row.count > 0), "expected Yahoo bar source health");
  assert(initialHealth.barsBySource.some((row) => row.source === "eastmoney" && row.count > 0), "expected Eastmoney fund NAV source health");
  assert(initialHealth.latestJob?.status === "success", "expected latest ingestion job status");
  assert(chartWall.sources.includes("yahoo"), "expected Yahoo source");
  assert(chartWall.sources.includes("eastmoney"), "expected Eastmoney source");
  assert(chartWall.items.length >= 100, "expected broad chart wall items");
  assert(chartWall.summary.visibleItems === chartWall.items.length, "expected chart wall summary visible count");
  assert(chartWall.summary.totalUniverseAssets >= 60, "expected chart wall summary universe count");
  assert(chartWall.facets.markets.some((facet) => facet.value === "美股"), "expected market facets");
  assert(chartWall.facets.assetTypes.some((facet) => facet.value === "fund"), "expected fund asset facet");
  assert(chartWall.facets.signals.some((facet) => facet.value === "breakout"), "expected signal facets");
  assert(markets.has("A 股") && markets.has("美股") && markets.has("港股") && markets.has("商品") && markets.has("基金") && markets.has("外汇") && markets.has("加密"), "expected multiple markets");
  assert(assetTypes.has("equity") && assetTypes.has("index") && assetTypes.has("fund") && assetTypes.has("commodity") && assetTypes.has("macro") && assetTypes.has("crypto"), "expected multiple asset types");
  assert(levels.has("broad-index") && levels.has("sector-index") && levels.has("company") && levels.has("instrument"), "expected multiple asset levels");
  assert(aShareWall.items.length >= 8 && aShareWall.items.every((item) => item.market === "A 股"), "expected A-share filtered chart wall");
  assert(fundWall.items.length >= 60 && fundWall.items.every((item) => item.assetType === "fund"), "expected expanded real fund/ETF chart wall");
  assert(fundWall.items.some((item) => item.market === "基金" && item.source === "eastmoney"), "expected China mutual funds from Eastmoney");
  assert(commodityWall.items.length >= 6 && commodityWall.items.every((item) => item.market === "商品"), "expected commodity chart wall");
  assert(isSortedDesc(sortedReturnWall.items, (item) => item.return1m), "expected return_1m sorting");
  assert(isSortedDesc(sortedVolumeWall.items, (item) => item.volumeRatio), "expected volume_ratio sorting");
  assert(weeklyWall.items.length >= 45 && weeklyWall.items.every((item) => item.sparkline.length > 10), "expected weekly resampled chart wall");
  assert(monthlyWall.items.length >= 45 && monthlyWall.items.every((item) => item.sparkline.length >= 36), "expected 5Y monthly chart wall");
  assert(fifteenMinuteWall.items.length >= 40 && fifteenMinuteWall.items.every((item) => item.sparkline.length >= 20), "expected 15m chart wall");
  assert(oneHourWall.items.length >= 40 && oneHourWall.items.every((item) => item.sparkline.length >= 20), "expected 1h chart wall");
  assert(fourHourWall.items.length >= 40 && fourHourWall.items.every((item) => item.sparkline.length >= 20), "expected 4h chart wall");
  assert(
    chartWall.items.every((item) => item.lastPrice !== null && item.sparkline.length >= 180 && item.indicators.length >= 180 && item.source && item.dataPointCount >= 180 && item.latestBarAt),
    "expected every chart wall item to include price, sparkline, indicators, source, and data density"
  );
  assert(chartWall.items.some((item) => item.return1m !== null && item.return6m !== null && item.drawdownPct !== null), "expected fixed-window return and drawdown metrics");
  assert(assetDetail.asset.symbol === "NVDA", "expected asset detail response");
  assert(assetBars.bars.length >= 60, "expected 3M asset bars");
  assert(assetIndicators.indicators.length >= 60, "expected 3M indicators");
  assert(mutualFundBars.source === "eastmoney" && mutualFundBars.bars.length >= 180, "expected Eastmoney mutual fund daily NAV history");
  assert(Array.isArray(scannerEvents.events), "expected scanner events endpoint");
  assert(compare.assets.length >= 4 && compare.assets.every((item) => item.bars.length >= 120), "expected compare data");
  assert(universeTree.nodes.length >= 6 && universeTree.nodes.every((node) => node.count > 0), "expected universe tree with asset-class nodes");
  assert(watchlists.watchlists.some((watchlist) => watchlist.assets.some((asset) => asset.id === "us-nvda")), "expected watchlist add asset");
  assert(pinnedWall.items.some((item) => item.id === "us-nvda" && item.isPinned), "expected pinned signal filter");
  assert(finalHealth.providers.some((provider) => provider.id === "yahoo" && provider.assetCount >= 55), "expected Yahoo provider health");
  assert(finalHealth.providers.some((provider) => provider.id === "eastmoney" && provider.assetCount >= 40), "expected Eastmoney provider health");
  assert(finalHealth.lastIngestionAt !== initialHealth.lastIngestionAt, "expected refresh endpoint to update ingestion time");

  console.log(
    JSON.stringify(
      {
        status: "passed",
        sources: chartWall.sources,
        assetCount: finalHealth.assetCount,
        barCount: finalHealth.barCount,
        chartWallItems: chartWall.items.length,
        fundItems: fundWall.items.length,
        commodityItems: commodityWall.items.length,
        mutualFundBars: mutualFundBars.bars.length,
        markets: [...markets],
        assetTypes: [...assetTypes],
        levels: [...levels],
        rawFileCount: finalHealth.rawFileCount,
        databaseSizeBytes: finalHealth.databaseSizeBytes,
        barsByTimeframe: finalHealth.barsByTimeframe,
        barsBySource: finalHealth.barsBySource,
        aShareItems: aShareWall.items.length,
        weeklyItems: weeklyWall.items.length,
        monthlyItems: monthlyWall.items.length,
        fifteenMinuteItems: fifteenMinuteWall.items.length,
        oneHourItems: oneHourWall.items.length,
        fourHourItems: fourHourWall.items.length,
        compareAssets: compare.assets.length,
        watchlistAssets: watchlists.watchlists[0]?.assets.length ?? 0,
        latestBarAt: finalHealth.latestBarAt,
        lastIngestionAt: finalHealth.lastIngestionAt
      },
      null,
      2
    )
  );
} finally {
  await stopProcess(child);
}
