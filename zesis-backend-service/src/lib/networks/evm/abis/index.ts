import fs from "fs-extra";

export type ABI = {
  address: string;
  interface: string[];
  bytecode: string;
};

const queryMtpValidatorAbi = JSON.parse(
  fs.readFileSync("abis/queryMtpValidator.json", "utf-8")
);
const multiQueryServiceAbi = JSON.parse(
  fs.readFileSync("abis/MultiQueryService.json", "utf-8")
);

export const ABIS: { [key: string]: ABI } = {
  QUERY_MTP_VALIDATOR: {
    address: "",
    interface: queryMtpValidatorAbi,
    bytecode: "",
  },
  MULTI_QUERY_SERVICE: {
    address: "",
    interface: multiQueryServiceAbi.abi,
    bytecode: multiQueryServiceAbi.bytecode,
  },
};
