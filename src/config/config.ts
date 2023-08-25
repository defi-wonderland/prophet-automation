import dotenv from 'dotenv';

dotenv.config();

interface Config {
  RPC_URL: string;
  CHAIN_ID: number;
}

const config: Config = {
  // eslint-disable-next-line no-undef
  RPC_URL: process.env.RPC_URL || '',
  // eslint-disable-next-line no-undef
  CHAIN_ID: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 0,
};

export default config;
