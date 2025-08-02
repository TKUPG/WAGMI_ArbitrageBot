require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/eewbTf8NV5M3MVEfwRs4u`,
      accounts: ['0x4b6e35a90fec61d81fd4eb6eb50badb76c3a664c784e6d0516cebe03de1c25aa'],
    },
  }, 
};
