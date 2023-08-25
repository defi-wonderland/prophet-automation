import '@nomiclabs/hardhat-ethers';
import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

dotenv.config({ path: './.env' });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
  },
  networks: {
    tenderly: {
      chainId: 10,
      url: process.env.RPC_URL,
      gas: 20000000,
    },
  },
};

export default config;
