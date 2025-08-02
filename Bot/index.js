const ethers = require("ethers");
const ccxt = require("ccxt");
const axios = require("axios");
const { Network, Alchemy } = require("alchemy-sdk");
const { calculateIndicators, shouldTrade } = require("./Technical_analysis");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/eewbTf8NV5M3MVEfwRs4u`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ArbitrageBotABI = [
  "function executeArbitrage(address,uint256,address,address,address,uint256)",
];
const botAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const contract = new ethers.Contract(botAddress, ArbitrageBotABI, wallet);

const exchanges = {
  binance: new ccxt.binance({ apiKey: process.env.BINANCE_API_KEY, secret: process.env.BINANCE_API_SECRET, enableRateLimit: true }),
  okx: new ccxt.okx({ apiKey: process.env.OKX_API_KEY, secret: process.env.OKX_API_SECRET, enableRateLimit: true }),
  bitget: new ccxt.bitget({ apiKey: process.env.BITGET_API_KEY, secret: process.env.BITGET_API_SECRET, enableRateLimit: true }),
  bybit: new ccxt.bybit({ apiKey: process.env.BYBIT_API_KEY, secret: process.env.BYBIT_API_SECRET, enableRateLimit: true }),
  kraken: new ccxt.kraken({ apiKey: process.env.KRAKEN_API_KEY, secret: process.env.KRAKEN_API_SECRET, enableRateLimit: true }),
  mexc: new ccxt.mexc({ apiKey: process.env.MEXC_API_KEY, secret: process.env.MEXC_API_SECRET, enableRateLimit: true }),
};

const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "BNB/USDT"];
let totalProfit = 0;

async function fetchMarketAnalysis(token) {
  const response = await axios.post("http://localhost:5000/analyze", { token, news: `Latest ${token} market news` });
  return response.data;
}

async function fetchHistoricalData(exchange, pair, timeframe = "1d", limit = 60) {
  const ohlcv = await exchange.fetchOHLCV(pair, timeframe, undefined, limit);
  return {
    close: ohlcv.map(candle => candle[4]),
    high: ohlcv.map(candle => candle[2]),
    low: ohlcv.map(candle => candle[3]),
  };
}

async function monitorPrices() {
  while (true) {
    try {
      for (const pair of pairs) {
        const prices = await Promise.all(
          Object.values(exchanges).map(async (exchange) => ({
            exchange: exchange.name,
            ticker: await exchange.fetchTicker(pair),
          }))
        );

        const sorted = prices.sort((a, b) => a.ticker.last - b.ticker.last);
        const buyExchange = sorted[0].exchange;
        const sellExchange = sorted[sorted.length - 1].exchange;
        const priceDiff = sorted[sorted.length - 1].ticker.last - sorted[0].ticker.last;

        const amount = ethers.utils.parseUnits("1", 18); // 1 unit of base currency
        const minProfit = ethers.utils.parseUnits("0.01", 18); // Minimum profit
        const profitMargin = priceDiff > minProfit ? (priceDiff - minProfit) / minProfit : 0;

        // Technical Analysis
        const historicalData = await fetchHistoricalData(exchanges[Object.keys(exchanges).find(k => exchanges[k].name === buyExchange)], pair);
        const indicators = calculateIndicators(historicalData.close, historicalData.high, historicalData.low);
        const tradeSignal = shouldTrade(indicators);

        // LLM Analysis
        const token = pair.split("/")[0];
        const marketAnalysis = await fetchMarketAnalysis(token);

        if (
          profitMargin > 0.01 && // 1% profit margin
          tradeSignal.shouldBuy &&
          marketAnalysis.sentiment === "Bullish"
        ) {
          console.log(`Arbitrage opportunity: Buy on ${buyExchange}, Sell on ${sellExchange}, Pair: ${pair}, Profit: ${profitMargin}`);
          
          // Mock exchange addresses for CEX (replace with actual bridge or mock contracts)
          const exchange1Address = "0x0000000000000000000000000000000000000001";
          const exchange2Address = "0x0000000000000000000000000000000000000002";

          const tx = await contract.executeArbitrage(
            "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
            amount,
            exchange1Address,
            exchange2Address,
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            minProfit,
            { gasLimit: 0.0005 }
          );
          await tx.wait();
          totalProfit += profitMargin;
          console.log(`Trade executed: ${tx.hash}, Total Profit: ${totalProfit}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every 1s
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}

monitorPrices();