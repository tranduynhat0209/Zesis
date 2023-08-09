import * as ethers from "ethers";
import { ABIS } from "./abis/index.js";
import { addressConfig } from "./addresses/index.js";
import { CHAINS, CHAIN_IDS } from "./chains.js";
import fs from "fs";

export function useContract(
  contractName: string,
  address: string,
  providerUrl: string
): ethers.Contract | undefined {
  if (ABIS[contractName] === undefined) return;
  return new ethers.Contract(
    address,
    ABIS[contractName]?.interface,
    new ethers.providers["JsonRpcProvider"](providerUrl)
  );
}

export function useQueryMtpValidator(
  chainId: number,
  address: string = "",
  providerUrl: string = ""
): ethers.Contract | undefined {
  if (!Object.values(CHAIN_IDS).includes(chainId)) return undefined;

  const ADDRESS = addressConfig[chainId]!.QUERY_MTP_VALIDATOR ?? address;
  const PROVIDER = CHAINS[chainId]!.rpcUrls[0] ?? providerUrl;

  return useContract("QUERY_MTP_VALIDATOR", ADDRESS, PROVIDER);
}

export function useMultiQueryService(
  chainId: number,
  address: string,
  providerUrl: string = ""
): ethers.Contract | undefined {
  if (!Object.values(CHAIN_IDS).includes(chainId)) return undefined;

  const ADDRESS = addressConfig[chainId]!.QUERY_MTP_VALIDATOR ?? address;
  const PROVIDER = CHAINS[chainId]!.rpcUrls[0] ?? providerUrl;

  return useContract("MULTI_QUERY_SERVICE", ADDRESS, PROVIDER);
}

export async function createMultiService(
  chainId: number,
  queries: any,
  providerUrl: string = ""
): Promise<ethers.Contract | undefined> {
  const RPC_PROVIDER = CHAINS[chainId]!.rpcUrls[0] ?? providerUrl;
  const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER);
  const { interface: abi, bytecode } = ABIS.MULTI_QUERY_SERVICE;
  const secret = JSON.parse(fs.readFileSync("secret.json", "utf-8"));
  const wallet = new ethers.Wallet(secret.pk, provider);
  let factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const queryMTPAddress = addressConfig[chainId]!.QUERY_MTP_VALIDATOR;
  let contract = await factory.deploy({ gasPrice: 150000000000 });
  await contract.deployed();
  console.log(contract);
  const initTx = await contract
    .connect(wallet)
    .functions.initialize(queryMTPAddress, { gasPrice: 150000000000 });
  await initTx.wait();

  const setQueries = await contract
    .connect(wallet)
    .functions.setQueries(queries, { gasPrice: 150000000000 });
  await setQueries.wait();
  console.log("queries set");
  return contract;
}

export async function updateMultiService(
  chainId: number,
  address: string,
  queries: any,
  providerUrl: string = ""
) {
  const RPC_PROVIDER = CHAINS[chainId]!.rpcUrls[0] ?? providerUrl;
  const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER);
  const { interface: abi } = ABIS.MULTI_QUERY_SERVICE;
  const secret = JSON.parse(fs.readFileSync("secret.json", "utf-8"));
  const wallet = new ethers.Wallet(secret.pk, provider);
  const contract = new ethers.Contract(address, abi, provider);
  console.log(queries);
  const setQueries = await contract
    .connect(wallet)
    .functions.setQueries(queries, { gasLimit: 3000000 });
  await setQueries.wait();
  console.log("queries set");
  return setQueries;
}

export { ABIS, addressConfig, CHAINS, CHAIN_IDS };
// export { ABIS } from './abis/index.js';
// export { addressConfig } from './addresses/index.js';
// export { CHAINS, CHAIN_IDS } from './chains.js';
