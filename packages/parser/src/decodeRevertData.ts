import type { DecodedRevert, Hex } from "@revertwtf/core";
import { isHex, selectorOf, bodyAfterSelector } from "@revertwtf/core";
import { describePanic } from "@revertwtf/catalog/panic";
import { lookupSelector } from "@revertwtf/selectors";
import { decodeAbiParameters, decodeErrorResult, type Abi } from "viem";

const ERROR_STRING_SELECTOR = "0x08c379a0";
const PANIC_SELECTOR = "0x4e487b71";

export interface DecodeOptions {
  abi?: Abi;
}

export function decodeRevertData(data: string, options: DecodeOptions = {}): DecodedRevert {
  if (!isHex(data)) {
    return { kind: "unknown", source: "unknown" };
  }
  const hex = data.toLowerCase() as Hex;

  if (hex === "0x") {
    return { kind: "empty", source: "standard-solidity" };
  }

  const sel = selectorOf(hex);
  if (!sel) return { kind: "unknown", source: "unknown", selector: hex };

  // Error(string)
  if (sel === ERROR_STRING_SELECTOR) {
    try {
      const [reason] = decodeAbiParameters(
        [{ type: "string" }],
        bodyAfterSelector(hex) as Hex,
      ) as [string];
      return {
        kind: "error_string",
        selector: sel,
        signature: "Error(string)",
        name: "Error",
        reason,
        source: "standard-solidity",
      };
    } catch {
      return { kind: "unknown", source: "standard-solidity", selector: sel };
    }
  }

  // Panic(uint256)
  if (sel === PANIC_SELECTOR) {
    try {
      const [codeBig] = decodeAbiParameters(
        [{ type: "uint256" }],
        bodyAfterSelector(hex) as Hex,
      ) as [bigint];
      const code = `0x${codeBig.toString(16).padStart(2, "0")}`;
      return {
        kind: "panic",
        selector: sel,
        signature: "Panic(uint256)",
        name: "Panic",
        panicCode: code,
        panicMeaning: describePanic(code),
        source: "standard-solidity",
      };
    } catch {
      return { kind: "unknown", source: "standard-solidity", selector: sel };
    }
  }

  // Custom error via provided ABI
  if (options.abi) {
    try {
      const decoded = decodeErrorResult({ abi: options.abi, data: hex });
      return {
        kind: "custom_error",
        selector: sel,
        signature: signatureFromAbiItem(
          decoded.errorName,
          decoded.abiItem as { inputs?: readonly { type: string }[] },
        ),
        name: decoded.errorName,
        args: decoded.args as readonly unknown[] | undefined,
        source: "provided-abi",
      };
    } catch {
      // fall through to built-in selector lookup
    }
  }

  // Built-in selector catalog
  const candidates = lookupSelector(sel);
  if (candidates.length > 0) {
    return {
      kind: "custom_error",
      selector: sel,
      signature: candidates[0]?.signature,
      name: candidates[0]?.name,
      source: "selector-catalog",
      candidates,
    };
  }

  return { kind: "unknown", source: "unknown", selector: sel };
}

function signatureFromAbiItem(
  name: string,
  abiItem: { inputs?: readonly { type: string }[] },
): string {
  return `${name}(${(abiItem.inputs ?? []).map((input) => input.type).join(",")})`;
}
