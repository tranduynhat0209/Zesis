import { ethers } from "ethers";
import { useSnackbar } from "notistack";
import React, { ReactNode, useEffect, useState } from "react";
import { Web3ContextProps } from "src/context/context";
import { addressConfig } from "src/contracts/addresses";
import {
  MultiQueryService__factory,
  State__factory,
} from "src/contracts/typechain";

const Web3Context = React.createContext<Web3ContextProps>(undefined as any);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const [address, setAddress] = useState<string | undefined>();
  const connectMetamask = React.useCallback(() => {
    // @ts-ignore
    if (window.ethereum) {
      //@ts-ignore
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then((accounts: string[]) => {
          setAddress(accounts[0]);
          enqueueSnackbar(`Connect to Metamask successfully!`, {
            variant: "success",
          });
        })
        .catch((error: any) => {
          enqueueSnackbar((error as Error).message, {
            variant: "error",
          });
        });
    } else {
      enqueueSnackbar(`Please install Metamask wallet on your browser`, {
        variant: "error",
      });
    }
  }, []);
  const signer = () => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  };
  const useStateContract = React.useCallback(() => {
    const chainId = localStorage.getItem("chainId");
    if (chainId && address) {
      try {
        const contractAddress = addressConfig[parseInt(chainId)].STATE;
        const state = State__factory.connect(contractAddress, signer());
        return state;
      } catch (err) {
        enqueueSnackbar((err as Error).message, { variant: "error" });
      }
    }
  }, [address]);

  const useServiceContract = React.useCallback(
    (contractAddress: string) => {
      const chainId = localStorage.getItem("chainId");
      if (chainId && address) {
        try {
          const service = MultiQueryService__factory.connect(
            contractAddress,
            signer()
          );
          return service;
        } catch (err) {
          enqueueSnackbar((err as Error).message, { variant: "error" });
        }
      }
    },
    [address]
  );

  useEffect(() => {
    try {
      // @ts-ignore
      if (window.ethereum) {
        // @ts-ignore
        window.ethereum.on("accountsChanged", (accounts) => {
          setAddress(accounts[0]);
        });
        // @ts-ignore
        window.ethereum.on("chainChanged", (chainId) => {
          localStorage.setItem("chainId", chainId);
        });
        // @ts-ignore
        window.ethereum.on("connect", ({ chainId }) => {
          localStorage.setItem("chainId", chainId);
        });
        // @ts-ignore
        window.ethereum.on("disconnect", () => {
          localStorage.removeItem("chainId");
        });
      } else {
        enqueueSnackbar("Please install Metamask extension first", {
          variant: "error",
        });
      }
    } catch (err) {
      enqueueSnackbar((err as Error).message, { variant: "error" });
    }
  }, [
    //@ts-ignore
    window.ethereum,
  ]);

  return (
    <Web3Context.Provider
      value={{
        address,
        connectMetamask,
        useStateContract,
        useServiceContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
export const useWeb3Context = () => React.useContext(Web3Context);
