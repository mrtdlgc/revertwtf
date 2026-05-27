import { decodeErrorResult, type Hex } from "viem";
import { decodeRevertData } from "@revertwtf/parser/decode";
import type { DecodedRevert } from "@revertwtf/core";
import { ENTRYPOINT_ERROR_ABI } from "./entryPointAbi.js";
import { parseAACode } from "./parseAACode.js";
import type { AACodeInfo } from "./codes.js";

export interface DecodedEntryPointError {
  kind: "FailedOp" | "FailedOpWithRevert" | "SignatureValidationFailed" | "unknown";
  opIndex?: bigint;
  reason?: string;
  aaCode?: AACodeInfo | null;
  inner?: Hex;
  innerDecoded?: DecodedRevert;
  aggregator?: string;
  raw: string;
}

export function decodeEntryPointError(data: string): DecodedEntryPointError {
  const out: DecodedEntryPointError = { kind: "unknown", raw: data };

  try {
    const decoded = decodeErrorResult({
      abi: ENTRYPOINT_ERROR_ABI,
      data: data as Hex,
    });

    if (decoded.errorName === "FailedOp") {
      const [opIndex, reason] = decoded.args as [bigint, string];
      out.kind = "FailedOp";
      out.opIndex = opIndex;
      out.reason = reason;
      out.aaCode = parseAACode(reason);
      return out;
    }
    if (decoded.errorName === "FailedOpWithRevert") {
      const [opIndex, reason, inner] = decoded.args as [bigint, string, Hex];
      out.kind = "FailedOpWithRevert";
      out.opIndex = opIndex;
      out.reason = reason;
      out.aaCode = parseAACode(reason);
      out.inner = inner;
      if (inner && inner !== "0x") {
        out.innerDecoded = decodeRevertData(inner);
      }
      return out;
    }
    if (decoded.errorName === "SignatureValidationFailed") {
      out.kind = "SignatureValidationFailed";
      out.aggregator = (decoded.args as [string])[0];
      return out;
    }
  } catch {
    // Fall through.
  }
  return out;
}
