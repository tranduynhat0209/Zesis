import { CHAIN_IDS } from "src/contracts/chains";
import bnbTestnetAddress from "./bnb-testnet";

export const addressConfig: { [chainId: number]: any } = {
  [CHAIN_IDS.BNB_TESTNET]: bnbTestnetAddress,
};
