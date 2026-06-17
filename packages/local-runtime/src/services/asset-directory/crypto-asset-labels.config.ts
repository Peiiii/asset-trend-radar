const cryptoNameByBaseAsset: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  TRX: "TRON",
  LINK: "Chainlink",
  DOT: "Polkadot",
  TON: "Toncoin",
  BCH: "Bitcoin Cash",
  LTC: "Litecoin",
  UNI: "Uniswap",
  AAVE: "Aave",
  NEAR: "NEAR Protocol",
  ETC: "Ethereum Classic"
};

export const getCryptoAssetLabel = (baseAsset: string): string =>
  cryptoNameByBaseAsset[baseAsset.toUpperCase()] ?? baseAsset;
