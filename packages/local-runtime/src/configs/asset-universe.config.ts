import type { AssetSummary } from "@gold-insights/market-domain";
import { aShareAssets } from "./asset-universe/a-share-assets.config";
import { assetHierarchy } from "./asset-universe/asset-hierarchy.config";
import { cnMutualFundSeedAssets } from "./asset-universe/cn-mutual-fund-seeds.config";
import { commodityAssets } from "./asset-universe/commodity-assets.config";
import { cryptoAssets } from "./asset-universe/crypto-assets.config";
import { hkAssets } from "./asset-universe/hk-assets.config";
import { macroAssets } from "./asset-universe/macro-assets.config";
import { usAssets } from "./asset-universe/us-assets.config";

export const assetUniverse: AssetSummary[] = [
  ...assetHierarchy,
  ...usAssets,
  ...aShareAssets,
  ...hkAssets,
  ...commodityAssets,
  ...cnMutualFundSeedAssets,
  ...macroAssets,
  ...cryptoAssets
];

export const tradableAssetUniverse = assetUniverse.filter((asset) => asset.level !== "asset-class" && asset.level !== "market");
