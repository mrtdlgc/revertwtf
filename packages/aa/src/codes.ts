export type AACategory =
  | "factory"
  | "account"
  | "paymaster"
  | "aggregator"
  | "gas"
  | "nonce"
  | "postOp"
  | "entryPoint"
  | "unknown";

export interface AACodeInfo {
  code: string;
  message: string;
  category: AACategory;
}

// Reference: ERC-4337 EntryPoint reason strings (v0.6, v0.7, v0.8 overlap).
export const AA_CODES: Record<string, AACodeInfo> = {
  AA10: { code: "AA10", message: "sender already constructed", category: "factory" },
  AA13: { code: "AA13", message: "initCode failed or OOG", category: "factory" },
  AA14: { code: "AA14", message: "initCode must return sender", category: "factory" },
  AA15: { code: "AA15", message: "initCode must create sender", category: "factory" },
  AA20: { code: "AA20", message: "account not deployed", category: "account" },
  AA21: { code: "AA21", message: "didn't pay prefund", category: "account" },
  AA22: { code: "AA22", message: "expired or not due", category: "account" },
  AA23: { code: "AA23", message: "reverted (or OOG)", category: "account" },
  AA24: { code: "AA24", message: "signature error", category: "account" },
  AA25: { code: "AA25", message: "invalid account nonce", category: "nonce" },
  AA30: { code: "AA30", message: "paymaster not deployed", category: "paymaster" },
  AA31: { code: "AA31", message: "paymaster deposit too low", category: "paymaster" },
  AA32: { code: "AA32", message: "paymaster expired or not due", category: "paymaster" },
  AA33: { code: "AA33", message: "paymaster reverted (or OOG)", category: "paymaster" },
  AA34: { code: "AA34", message: "paymaster signature error", category: "paymaster" },
  AA40: { code: "AA40", message: "over verificationGasLimit", category: "gas" },
  AA41: { code: "AA41", message: "too little verificationGas", category: "gas" },
  AA50: { code: "AA50", message: "postOp reverted", category: "postOp" },
  AA51: { code: "AA51", message: "prefund below actualGasCost", category: "postOp" },
  AA90: { code: "AA90", message: "invalid beneficiary", category: "entryPoint" },
  AA91: { code: "AA91", message: "failed send to beneficiary", category: "entryPoint" },
  AA92: { code: "AA92", message: "internal call only", category: "entryPoint" },
  AA93: { code: "AA93", message: "invalid paymasterAndData", category: "paymaster" },
  AA94: { code: "AA94", message: "invalid aggregator", category: "aggregator" },
  AA95: { code: "AA95", message: "out of gas", category: "gas" },
};

export function lookupAACode(code: string): AACodeInfo | null {
  return AA_CODES[code.toUpperCase()] ?? null;
}
