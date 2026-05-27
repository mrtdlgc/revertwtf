// Minimal ABI for EntryPoint custom errors.
export const ENTRYPOINT_ERROR_ABI = [
  {
    type: "error",
    name: "FailedOp",
    inputs: [
      { name: "opIndex", type: "uint256" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "error",
    name: "FailedOpWithRevert",
    inputs: [
      { name: "opIndex", type: "uint256" },
      { name: "reason", type: "string" },
      { name: "inner", type: "bytes" },
    ],
  },
  {
    type: "error",
    name: "SignatureValidationFailed",
    inputs: [{ name: "aggregator", type: "address" }],
  },
] as const;
