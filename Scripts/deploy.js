const hre = require("hardhat");

async function main() {
  const WAGMIArbitrageBot = await hre.ethers.getContractFactory("WAGMIArbitrageBot");
  const bot = await WAGMIArbitrageBot.deploy("0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8"); // Aave LendingPoolAddressesProvider on Sepolia
  await bot.deployed();
  console.log("WAGMIArbitrageBot deployed to:", bot.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});