type BasicChainInformation = {
  name: string;
  blockExplorerUrls?: string[];
  rpcUrls: string[];
  isTestnet?: boolean;
};

const CHAIN_IDS = {
  BNB_TESTNET: 97,
};

const CHAINS: { [chainId: number]: BasicChainInformation } = {
  [CHAIN_IDS.BNB_TESTNET]: {
    name: "BSC Testnet",
    blockExplorerUrls: ["https://testnet.bscscan.com"],
    rpcUrls: [
      "https://data-seed-prebsc-1-s1.binance.org:8545/",
      "https://data-seed-prebsc-2-s1.binance.org:8545/",
      "https://data-seed-prebsc-1-s2.binance.org:8545/",
      "https://data-seed-prebsc-2-s2.binance.org:8545/",
      "https://data-seed-prebsc-1-s3.binance.org:8545/",
      "https://data-seed-prebsc-2-s3.binance.org:8545/",
    ],
    isTestnet: true,
  },
};

export { CHAINS, CHAIN_IDS };
