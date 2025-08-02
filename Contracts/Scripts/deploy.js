const hre = require("hardhat");

async function main() {
  const WAGMIArbitrageBot = await hre.ethers.getContractFactory("WAGMIArbitrageBot");
  const bot = await WAGMIArbitrageBot.deploy("0x6ae43d3271ff6888e7fc43fd7321a503ff738951"); // Sepolia Aave V3
  await bot.deployed();
  console.log("WAGMIArbitrageBot deployed to:", bot.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});