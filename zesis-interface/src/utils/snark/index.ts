export const callData = async (proof: any, publicSignals: any) => {
  const callData = // @ts-ignore
    (await window.snarkjs.groth16.exportSolidityCallData(proof, publicSignals))
      .toString()
      .split(",")
      .map((e: any) => {
        return e.replaceAll(/([\[\]\s\"])/g, "");
      });
  let a, b, c, publicInputs: any;
  b = [];
  a = callData.slice(0, 2).map((e: any) => BigInt(e));
  b[0] = callData.slice(2, 4).map((e: any) => BigInt(e));
  b[1] = callData.slice(4, 6).map((e: any) => BigInt(e));
  c = callData.slice(6, 8).map((e: any) => BigInt(e));
  publicInputs = callData.slice(8, callData.length).map((e: any) => BigInt(e));
  return { a, b, c, publicInputs };
};

export const getStateTransactionCalldata = async (witness: any) => {
  const { proof, publicSignals } = await // @ts-ignore
  window.snarkjs.groth16.fullProve(witness, "/stateTransition.wasm", "/stateTransition.zkey");
  return await callData(proof, publicSignals);
};

export const getQueryMTPCalldata = async (witness: any) => {
  const { proof, publicSignals } = await // @ts-ignore
  window.snarkjs.groth16.fullProve(witness, "/query.wasm", "/query.zkey");
  return await callData(proof, publicSignals);
};
