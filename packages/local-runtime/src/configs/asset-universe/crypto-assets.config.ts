import type { AssetSeed } from "./asset-universe.builders";
import { binance } from "./asset-universe.builders";

export const cryptoAssets: AssetSeed[] = [
  binance("btcusdt", "BTC/USDT", "Bitcoin", ["加密", "重点资产"]),
  binance("ethusdt", "ETH/USDT", "Ethereum", ["加密", "重点资产"]),
  binance("bnbusdt", "BNB/USDT", "BNB", ["加密"]),
  binance("solusdt", "SOL/USDT", "Solana", ["加密"]),
  binance("xrpusdt", "XRP/USDT", "XRP", ["加密"]),
  binance("dogeusdt", "DOGE/USDT", "Dogecoin", ["加密"]),
  binance("adausdt", "ADA/USDT", "Cardano", ["加密"]),
  binance("linkusdt", "LINK/USDT", "Chainlink", ["加密"]),
  binance("ltcusdt", "LTC/USDT", "Litecoin", ["加密"]),
  binance("bchusdt", "BCH/USDT", "Bitcoin Cash", ["加密"]),
  binance("dotusdt", "DOT/USDT", "Polkadot", ["加密"]),
  binance("avaxusdt", "AVAX/USDT", "Avalanche", ["加密"]),
  binance("trxusdt", "TRX/USDT", "TRON", ["加密"]),
  binance("hbarusdt", "HBAR/USDT", "Hedera", ["加密"]),
  binance("xlmusdt", "XLM/USDT", "Stellar", ["加密"]),
  binance("atomusdt", "ATOM/USDT", "Cosmos", ["加密"]),
  binance("etcusdt", "ETC/USDT", "Ethereum Classic", ["加密"]),
  binance("filusdt", "FIL/USDT", "Filecoin", ["加密"]),
  binance("nearusdt", "NEAR/USDT", "NEAR Protocol", ["加密"]),
  binance("opusdt", "OP/USDT", "Optimism", ["加密"]),
  binance("suiusdt", "SUI/USDT", "Sui", ["加密"], "SUI20947-USD"),
  binance("aptusdt", "APT/USDT", "Aptos", ["加密"], "APT21794-USD"),
  binance("arbusdt", "ARB/USDT", "Arbitrum", ["加密"], "ARB11841-USD")
];
