/**const ethers = require("ethers");
const ccxt = require("ccxt");
const { Telegraf } = require("telegraf");
require("dotenv").config();
const axios = require("axios");

const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const ArbitrageBotABI = [
  "function executeArbitrage(address,uint256,address,address,address,uint256)",
];
const botAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const contract = new ethers.Contract(botAddress, ArbitrageBotABI, wallet);

const binance = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
});
const kraken = new ccxt.kraken({
  apiKey: process.env.KRAKEN_API_KEY,
  secret: process.env.KRAKEN_API_SECRET,
});

let totalProfit = 0;

async function fetchMarketAnalysis(token) {
  // Simulate offline LLM analysis (replace with actual LLM integration)
  return {
    sentiment: "Bullish",
    technical: "Buy signal on MACD crossover",
    fundamental: `Strong ${token} fundamentals due to recent news`,
  };
}

async function monitorPrices() {
  while (true) {
    try {
      const pair = "ETH/USDT";
      const [binancePrice, krakenPrice] = await Promise.all([
        binance.fetchTicker(pair),
        kraken.fetchTicker(pair),
      ]);

      const priceDiff = Math.abs(binancePrice.last - krakenPrice.last);
      const amount = ethers.utils.parseUnits("1", 18); // 1 ETH
      const minProfit = ethers.utils.parseUnits("0.01", 18); // Minimum profit

      const analysis = await fetchMarketAnalysis("ETH");
      const profitMargin = priceDiff > minProfit ? (priceDiff - minProfit) / minProfit : 0;

      if (profitMargin > 0.01) {
        const buyExchange = binancePrice.last < krakenPrice.last ? binance : kraken;
        const sellExchange = binancePrice.last < krakenPrice.last ? kraken : binance;
        const exchange1Address = "0x..."; // Replace with CEX contract address or mock
        const exchange2Address = "0x..."; // Replace with CEX contract address or mock

        console.log(`Arbitrage opportunity: Buy on ${buyExchange.name}, Sell on ${sellExchange.name}`);
        await bot.telegram.sendMessage(
          YOUR_TELEGRAM_CHAT_ID,
          `Opportunity detected!\nPair: ${pair}\nPrice Diff: ${priceDiff}\nProfit Margin: ${(profitMargin * 100).toFixed(2)}%\nAnalysis: ${JSON.stringify(analysis)}`
        );

        const tx = await contract.executeArbitrage(
          "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
          amount,
          exchange1Address,
          exchange2Address,
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
          minProfit
        );
        await tx.wait();
        totalProfit += profitMargin;
        await bot.telegram.sendMessage(
          YOUR_TELEGRAM_CHAT_ID,
          `Trade executed: ${tx.hash}\nTotal Profit: ${totalProfit} ETH`
        );
      }

      await bot.telegram.sendMessage(
        YOUR_TELEGRAM_CHAT_ID,
        `Bot Health: Running\nPnL: ${totalProfit} ETH\nLast Check: ${new Date().toISOString()}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1s
    } catch (error) {
      console.error("Error:", error);
      await bot.telegram.sendMessage(YOUR_TELEGRAM_CHAT_ID, `Error: ${error.message}`);
    }
  }
}

bot.command("start", (ctx) => ctx.reply("Arbitrage Bot started!"));
bot.command("status", (ctx) => ctx.reply(`Bot Health: Running\nPnL: ${totalProfit} ETH`));
bot.launch();
monitorPrices();**/

const ethers = require("ethers");
const ccxt = require("ccxt");
const axios = require("axios");
const { calculateIndicators, shouldTrade } = require("./Technical_analysis");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
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
            { gasLimit: 500000 }
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