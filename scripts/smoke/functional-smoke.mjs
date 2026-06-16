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
    throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
};

const isSortedDesc = (items, getValue) => {
  const values = items.map(getValue).filter((value) => typeof value === "number" && Number.isFinite(value));
  return values.every((value, index) => index === 0 || values[index - 1] >= value);
};

const numbersAlmostEqual = (left, right, tolerance = 0.000001) =>
  typeof left === "number" && typeof right === "number" && Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;

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
  const preciousMetalsWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E5%95%86%E5%93%81&assetType=all&tag=%E8%B4%B5%E9%87%91%E5%B1%9E&sort=return_1m");
  const agricultureWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E5%95%86%E5%93%81&assetType=all&tag=%E5%86%9C%E4%BA%A7%E5%93%81&sort=return_1m");
  const sortedReturnWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=return_1m");
  const dataFreshWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&signal=data_fresh&sort=trend_score");
  const sortedDataPointWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=data_point_count&order=desc");
  const cryptoOneMonthWall = await fetchJson("/api/chart-wall?range=1m&timeframe=1d&universe=global&level=all&market=%E5%8A%A0%E5%AF%86&assetType=crypto&sort=return_1m&order=desc");
  const sortedVolumeWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=volume_ratio");
  const weeklyWall = await fetchJson("/api/chart-wall?range=1y&timeframe=1w&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const monthlyWall = await fetchJson("/api/chart-wall?range=5y&timeframe=1mo&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const fifteenMinuteWall = await fetchJson("/api/chart-wall?range=1m&timeframe=15m&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const oneHourWall = await fetchJson("/api/chart-wall?range=1m&timeframe=1h&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const fourHourWall = await fetchJson("/api/chart-wall?range=1m&timeframe=4h&universe=global&level=all&market=all&assetType=all&sort=trend_score");
  const assetDetail = await fetchJson("/api/assets/us-nvda");
  const assetDrilldownDetail = await fetchJson("/api/assets/us-nvda/detail?range=1m&timeframe=1d");
  const assetBars = await fetchJson("/api/assets/us-nvda/bars?range=3m&timeframe=1d");
  const assetIndicators = await fetchJson("/api/assets/us-nvda/indicators?range=3m&timeframe=1d");
  const mutualFundBars = await fetchJson("/api/assets/fund-cn-005827/bars?range=1y&timeframe=1d");
  const fundCatalogSummary = await fetchJson("/api/funds/eastmoney/catalog/summary");
  const fundCatalogPage = await fetchJson("/api/funds/eastmoney/catalog?keyword=%E5%8D%8E%E5%A4%8F&fundType=all&status=all&limit=20&offset=0");
  const sortedFundCatalogPage = await fetchJson("/api/funds/eastmoney/catalog?keyword=%E5%8D%8E%E5%A4%8F&fundType=all&status=not_imported&sort=return_1m&order=desc&limit=20&offset=0");
  const fundSearch = await fetchJson("/api/funds/eastmoney/search?keyword=000001&limit=5");
  const importedFund = await fetchJson("/api/funds/eastmoney/import", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ code: "000001" })
  });
  const importedFundBars = await fetchJson("/api/assets/fund-cn-000001/bars?range=1y&timeframe=1d");
  const importedFundWall = await fetchJson("/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=%E5%9F%BA%E9%87%91&assetType=fund&sort=return_1m");
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
  const taskCenter = await fetchJson("/api/tasks?limit=40");
  const tinyTaskCenter = await fetchJson("/api/tasks?limit=1");
  const markets = new Set(chartWall.items.map((item) => item.market));
  const assetTypes = new Set(chartWall.items.map((item) => item.assetType));
  const levels = new Set(chartWall.items.map((item) => item.level));

  assert(initialHealth.assetCount >= 150, "expected full asset universe with hierarchy nodes, expanded funds, and expanded commodities");
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
  assert(chartWall.items.length >= 125, "expected broad chart wall items with expanded commodities");
  assert(chartWall.summary.visibleItems === chartWall.items.length, "expected chart wall summary visible count");
  assert(chartWall.summary.totalUniverseAssets >= 85, "expected chart wall summary universe count with expanded commodities");
  assert(chartWall.facets.markets.some((facet) => facet.value === "美股"), "expected market facets");
  assert(chartWall.facets.assetTypes.some((facet) => facet.value === "fund"), "expected fund asset facet");
  assert(chartWall.facets.signals.some((facet) => facet.value === "breakout"), "expected signal facets");
  assert(chartWall.facets.signals.some((facet) => facet.value === "data_fresh" && facet.count > 0), "expected data freshness signal facet");
  assert(markets.has("A 股") && markets.has("美股") && markets.has("港股") && markets.has("商品") && markets.has("基金") && markets.has("外汇") && markets.has("加密"), "expected multiple markets");
  assert(assetTypes.has("equity") && assetTypes.has("index") && assetTypes.has("fund") && assetTypes.has("commodity") && assetTypes.has("macro") && assetTypes.has("crypto"), "expected multiple asset types");
  assert(levels.has("broad-index") && levels.has("sector-index") && levels.has("company") && levels.has("instrument"), "expected multiple asset levels");
  assert(aShareWall.items.length >= 8 && aShareWall.items.every((item) => item.market === "A 股"), "expected A-share filtered chart wall");
  assert(fundWall.items.length >= 60 && fundWall.items.every((item) => item.assetType === "fund"), "expected expanded real fund/ETF chart wall");
  assert(fundWall.items.some((item) => item.market === "基金" && item.source === "eastmoney"), "expected China mutual funds from Eastmoney");
  assert(commodityWall.items.length >= 30 && commodityWall.items.every((item) => item.market === "商品"), "expected expanded commodity chart wall");
  assert(commodityWall.facets.tags.some((facet) => facet.value === "贵金属" && facet.count >= 8), "expected tag facets for precious metals");
  assert(commodityWall.facets.tags.some((facet) => facet.value === "农产品" && facet.count >= 6), "expected tag facets for agriculture");
  assert(preciousMetalsWall.tag === "贵金属" && preciousMetalsWall.items.length >= 8 && preciousMetalsWall.items.every((item) => item.tags.includes("贵金属")), "expected precious metals tag-filtered commodity chart wall");
  assert(agricultureWall.tag === "农产品" && agricultureWall.items.length >= 6 && agricultureWall.items.every((item) => item.tags.includes("农产品")), "expected agriculture tag-filtered commodity chart wall");
  assert(isSortedDesc(sortedReturnWall.items, (item) => item.return1m), "expected return_1m sorting");
  assert(dataFreshWall.signal === "data_fresh" && dataFreshWall.items.length > 0 && dataFreshWall.items.every((item) => item.latestBarAt && item.dataPointCount >= 20), "expected data_fresh signal filter");
  assert(isSortedDesc(sortedDataPointWall.items, (item) => item.dataPointCount), "expected data_point_count sorting");
  assert(cryptoOneMonthWall.order === "desc" && isSortedDesc(cryptoOneMonthWall.items, (item) => item.return1m), "expected explicit sort order for crypto 1M return");
  assert(
    cryptoOneMonthWall.items.every((item) => numbersAlmostEqual(item.returnPct, item.return1m)),
    "expected visible 1M chart return to align with fixed 1M return metric"
  );
  assert(cryptoOneMonthWall.facets.markets.every((facet) => typeof facet.count === "number"), "expected eager market facet counts");
  assert(cryptoOneMonthWall.facets.assetTypes.every((facet) => typeof facet.count === "number"), "expected eager asset type facet counts");
  assert(cryptoOneMonthWall.facets.markets.some((facet) => facet.value === "美股" && facet.count > 0), "expected market facet counts to ignore current market filter");
  assert(cryptoOneMonthWall.facets.assetTypes.some((facet) => facet.value === "fund" && facet.count > 0), "expected asset type facet counts to ignore current asset type filter");
  assert(cryptoOneMonthWall.facets.levels.some((facet) => facet.value === "company" && facet.count > 0), "expected level facet counts to ignore current level filter");
  assert(isSortedDesc(sortedVolumeWall.items, (item) => item.volumeRatio), "expected volume_ratio sorting");
  assert(weeklyWall.items.length >= 45 && weeklyWall.items.every((item) => item.sparkline.length > 10), "expected weekly resampled chart wall");
  assert(monthlyWall.items.length >= 45 && monthlyWall.items.every((item) => item.sparkline.length >= 36), "expected 5Y monthly chart wall");
  assert(fifteenMinuteWall.items.length >= 40 && fifteenMinuteWall.items.every((item) => item.sparkline.length >= 20), "expected 15m chart wall");
  assert(oneHourWall.items.length >= 40 && oneHourWall.items.every((item) => item.sparkline.length >= 20), "expected 1h chart wall");
  assert(fourHourWall.items.length >= 40 && fourHourWall.items.every((item) => item.sparkline.length >= 20), "expected 4h chart wall");
  assert(
    chartWall.items.every((item) => item.lastPrice !== null && item.sparkline.length >= 90 && item.indicators.length >= 90 && item.source && item.dataPointCount >= 90 && item.latestBarAt),
    "expected every chart wall item to include price, calendar-window sparkline, indicators, source, and data density"
  );
  assert(chartWall.items.some((item) => item.return1m !== null && item.return6m !== null && item.drawdownPct !== null), "expected fixed-window return and drawdown metrics");
  assert(assetDetail.asset.symbol === "NVDA", "expected asset detail response");
  assert(assetDrilldownDetail.item.id === "us-nvda" && assetDrilldownDetail.item.symbol === "NVDA" && assetDrilldownDetail.item.dataPointCount >= 15, "expected independent asset drilldown detail response");
  assert(assetBars.bars.length >= 60, "expected 3M asset bars");
  assert(assetIndicators.indicators.length >= 60, "expected 3M indicators");
  assert(mutualFundBars.source === "eastmoney" && mutualFundBars.bars.length >= 180, "expected Eastmoney mutual fund daily NAV history");
  assert((fundCatalogSummary.summary.totalCount === 0 || fundCatalogSummary.summary.totalCount >= 20000), "expected Eastmoney fund catalog summary endpoint");
  assert(fundCatalogPage.catalog.totalCount >= 20000 && fundCatalogPage.totalCount > 0 && fundCatalogPage.items.length > 0, "expected paginated Eastmoney fund catalog endpoint");
  assert(fundCatalogPage.fundTypes.every((facet) => typeof facet.count === "number") && fundCatalogPage.statusFacets.every((facet) => typeof facet.count === "number"), "expected eager fund catalog facet counts");
  assert(fundCatalogPage.items.every((item) => typeof item.isImported === "boolean" && typeof item.dataPointCount === "number"), "expected fund catalog import status and lightweight metrics");
  assert(fundCatalogPage.catalog.metricSyncedAt, "expected fund catalog lightweight rank snapshot sync time");
  assert(
    fundCatalogPage.items.some((item) => !item.isImported && item.metricSource === "catalog_snapshot" && item.latestNav !== null && item.return1m !== null),
    "expected not-imported funds to include lightweight catalog snapshot returns"
  );
  assert(sortedFundCatalogPage.sort === "return_1m" && sortedFundCatalogPage.order === "desc", "expected fund catalog sort contract to round-trip");
  assert(
    isSortedDesc(sortedFundCatalogPage.items, (item) => item.return1m),
    "expected fund catalog lightweight 1M return sorting"
  );
  assert(
    sortedFundCatalogPage.items.some((item) => !item.isImported && item.metricSource === "catalog_snapshot" && item.return1m !== null),
    "expected sorted fund catalog to include not-imported snapshot metrics"
  );
  assert(fundSearch.catalog.totalCount >= 20000 && fundSearch.source === "local-catalog", "expected local Eastmoney fund catalog search");
  assert(fundSearch.results.some((item) => item.code === "000001" && item.name.includes("华夏成长")), "expected Eastmoney fund catalog search result");
  assert(importedFund.asset?.id === "fund-cn-000001" && importedFund.barsImported >= 180, "expected dynamic Eastmoney fund import");
  assert(importedFundBars.source === "eastmoney" && importedFundBars.bars.length >= 180, "expected imported fund bars endpoint");
  assert(importedFundWall.items.some((item) => item.id === "fund-cn-000001" && item.source === "eastmoney"), "expected imported fund in chart wall");
  assert(Array.isArray(scannerEvents.events), "expected scanner events endpoint");
  assert(compare.assets.length >= 4 && compare.assets.every((item) => item.bars.length >= 90), "expected compare data");
  assert(universeTree.nodes.length >= 6 && universeTree.nodes.every((node) => node.count > 0), "expected universe tree with asset-class nodes");
  assert(watchlists.watchlists.some((watchlist) => watchlist.assets.some((asset) => asset.id === "us-nvda")), "expected watchlist add asset");
  assert(pinnedWall.items.some((item) => item.id === "us-nvda" && item.isPinned), "expected pinned signal filter");
  assert(finalHealth.providers.some((provider) => provider.id === "yahoo" && provider.assetCount >= 75), "expected Yahoo provider health with expanded commodities");
  assert(finalHealth.providers.some((provider) => provider.id === "eastmoney" && provider.assetCount >= 40), "expected Eastmoney provider health");
  assert(finalHealth.lastIngestionAt !== initialHealth.lastIngestionAt, "expected refresh endpoint to update ingestion time");
  assert(taskCenter.tasks.length >= 2 && typeof taskCenter.runningCount === "number", "expected task center endpoint with recent tasks");
  assert(taskCenter.totalCount >= taskCenter.tasks.length, "expected task center total count to cover returned recent tasks");
  assert(tinyTaskCenter.tasks.length === 1, "expected task center limit to only constrain recent task list");
  assert(tinyTaskCenter.totalCount === taskCenter.totalCount, "expected task center total count to ignore task list limit");
  assert(tinyTaskCenter.runningCount === taskCenter.runningCount, "expected task center running count to ignore task list limit");
  assert(tinyTaskCenter.failedCount === taskCenter.failedCount, "expected task center failed count to ignore task list limit");
  assert(tinyTaskCenter.staleRunningCount === taskCenter.staleRunningCount, "expected task center stale running count to ignore task list limit");
  assert(tinyTaskCenter.successCount === taskCenter.successCount, "expected task center success count to ignore task list limit");
  assert(Array.isArray(taskCenter.activeTasks) && Array.isArray(taskCenter.recentFailures), "expected task center focus task collections");
  assert(Array.isArray(taskCenter.pipelineSummaries) && taskCenter.pipelineSummaries.length >= 2, "expected task center pipeline summaries");
  assert(Array.isArray(taskCenter.actions) && taskCenter.actions.length >= 2, "expected task center runnable actions");
  assert(tinyTaskCenter.actions.length === taskCenter.actions.length, "expected task center actions to ignore task list limit");
  assert(
    taskCenter.pipelineSummaries.some((pipeline) => pipeline.vendor === "multi-source" && pipeline.dataset === "global-bars-1d" && typeof pipeline.totalCount === "number"),
    "expected task center global ingestion pipeline summary"
  );
  assert(
    taskCenter.pipelineSummaries.some((pipeline) => pipeline.vendor === "eastmoney" && pipeline.dataset.startsWith("fund-import") && typeof pipeline.successCount === "number"),
    "expected task center fund import pipeline summary"
  );
  assert(taskCenter.tasks.some((task) => task.vendor === "multi-source" && task.dataset === "global-bars-1d"), "expected global ingestion task in task center");
  assert(taskCenter.tasks.some((task) => task.vendor === "eastmoney" && task.dataset.startsWith("fund-import")), "expected fund import task in task center");
  assert(
    taskCenter.actions.some((action) => action.key === "refresh-global-bars" && action.vendor === "multi-source" && action.dataset === "global-bars-1d" && action.latestStatus === "success"),
    "expected global refresh action status in task center"
  );
  assert(
    taskCenter.actions.some((action) => action.key === "sync-fund-catalog" && action.vendor === "eastmoney" && action.dataset === "fund-catalog"),
    "expected fund catalog action in task center"
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        sources: chartWall.sources,
        assetCount: finalHealth.assetCount,
        barCount: finalHealth.barCount,
        chartWallItems: chartWall.items.length,
        dataFreshItems: dataFreshWall.items.length,
        topDataPointCount: sortedDataPointWall.items[0]?.dataPointCount ?? null,
        fundItems: fundWall.items.length,
        commodityItems: commodityWall.items.length,
        preciousMetalsItems: preciousMetalsWall.items.length,
        agricultureItems: agricultureWall.items.length,
        mutualFundBars: mutualFundBars.bars.length,
        fundCatalogCount: fundSearch.catalog.totalCount,
        sortedFundCatalogTopReturn1m: sortedFundCatalogPage.items[0]?.return1m ?? null,
        importedFund: {
          id: importedFund.asset.id,
          barsImported: importedFund.barsImported,
          chartWallVisible: importedFundWall.items.some((item) => item.id === "fund-cn-000001")
        },
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
        taskCenter: {
          tasks: taskCenter.tasks.length,
          totalCount: taskCenter.totalCount,
          runningCount: taskCenter.runningCount,
          failedCount: taskCenter.failedCount,
          activeTasks: taskCenter.activeTasks.length,
          recentFailures: taskCenter.recentFailures.length,
          pipelineSummaries: taskCenter.pipelineSummaries.length,
          actions: taskCenter.actions.map((action) => ({
            key: action.key,
            status: action.latestStatus,
            isRunning: action.isRunning
          }))
        },
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
