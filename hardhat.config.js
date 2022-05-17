require("@nomiclabs/hardhat-waffle");
require('dotenv').config()
module.exports = {
  solidity: "0.8.4",
  paths: {
    artifacts: "./src/backend/artifacts",
    sources: "./src/backend/contracts",
    cache: "./src/backend/cache",
    tests: "./src/backend/test"
  },
  networks: {
     rinkeby: {
      url: process.env.ALCHEMY_URL,
     accounts:[process.env.WALLET_PRIVATE_KEY]
    },
  }
};
