export type Hex = `0x${string}`;

export type ErrorLayer =
  | "evm"
  | "rpc"
  | "provider"
  | "wallet"
  | "library"
  | "account_abstraction"
  | "protocol"
  | "unknown";

export type Confidence = "high" | "medium" | "low";

export type Helpfulness = "yes" | "no" | "sometimes" | "unknown";

export type EvidenceType =
  | "matched_pattern"
  | "json_rpc_code"
  | "library_code"
  | "revert_selector"
  | "decoded_error"
  | "panic_code"
  | "catalog_entry"
  | "abi"
  | "aa_code"
  | "trace"
  | "message_heuristic";

export interface Evidence {
  type: EvidenceType;
  value: string;
  path?: string;
  source?: string;
}

export type DecodedRevertKind =
  | "error_string"
  | "panic"
  | "custom_error"
  | "empty"
  | "unknown";

export type DecodedRevertSource =
  | "standard-solidity"
  | "provided-abi"
  | "revertwtf-catalog"
  | "selector-catalog"
  | "remote-selector"
  | "message-heuristic"
  | "unknown";

export interface SignatureCandidate {
  selector: Hex;
  signature: string;
  name?: string;
  source: string;
  confidence: "verified" | "known" | "candidate" | "unknown";
}

export interface DecodedRevert {
  kind: DecodedRevertKind;
  selector?: Hex;
  signature?: string;
  name?: string;
  args?: readonly unknown[];
  reason?: string;
  panicCode?: string;
  panicMeaning?: string;
  source: DecodedRevertSource;
  candidates?: SignatureCandidate[];
}

export interface Reference {
  label: string;
  url: string;
}

export interface Explanation {
  id?: string;
  title: string;
  layer: ErrorLayer;
  category: string;
  summary: string;
  rootCauseKnown: boolean;
  likelyCauses: string[];
  nextSteps: string[];
  retryHelpful: Helpfulness;
  increasingGasHelpful: Helpfulness;
  confidence: Confidence;
  evidence: Evidence[];
  decoded?: DecodedRevert;
  related?: string[];
  references?: Reference[];
}

export interface RevertDataCandidate {
  data: Hex;
  path: string;
}

export interface TraceFrameSummary {
  path: string;
  type?: string;
  opcode?: string;
  from?: string;
  to?: string;
  contractName?: string;
  functionName?: string;
  error?: string;
  revertReason?: string;
  output?: Hex;
  gasUsed?: string | number;
}

export interface NormalizedError {
  raw: unknown;
  messages: { value: string; path: string }[];
  codes: { value: string | number; path: string }[];
  method?: string;
  action?: string;
  errorName?: string;
  revertData: RevertDataCandidate[];
  traceFrames: TraceFrameSummary[];
}
