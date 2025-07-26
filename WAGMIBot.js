const ethers = require("ethers");
const ccxt = require("ccxt");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const uniswap = new ccxt.uniswap({ enableRateLimit: true });
const sushiswap = new ccxt.sushiswap({ enableRateLimit: true });

const ArbitrageBotABI = [
  // Add relevant ABI from ArbitrageBot.sol
  "function executeArbitrage(address,uint256,address,uint256,address[],address[])",
];
const botAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const contract = new ethers.Contract(botAddress, ArbitrageBotABI, wallet);

async function monitorPrices() {
  while (true) {
    try {
      const uniPrice = await uniswap.fetchTicker("ETH/USDT");
      const sushiPrice = await sushiswap.fetchTicker("ETH/USDT");
      const priceDiff = Math.abs(uniPrice.last - sushiPrice.last);

      const amount = ethers.utils.parseUnits("1", 18); // 1 ETH
      const minProfit = ethers.utils.parseUnits("0.01", 18); // Minimum profit
      const pathUniswap = [
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      ];
      const pathSushiSwap = [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      ];

      if (priceDiff > minProfit) {
        console.log("Arbitrage opportunity detected!");
        const tx = await contract.executeArbitrage(
          pathUniswap[0],
          amount,
          pathSushiSwap[0],
          minProfit,
          pathUniswap,
          pathSushiSwap
        );
        await tx.wait();
        console.log("Trade executed:", tx.hash);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1s
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

monitorPrices();