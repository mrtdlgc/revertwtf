import type { Explanation } from "@revertwtf/core";
import { explain } from "@revertwtf/parser/explain";
import { parseAACode } from "./parseAACode.js";
import { decodeEntryPointError } from "./decodeEntryPointError.js";

export function explainAAError(input: unknown): Explanation[] {
  const out: Explanation[] = [];

  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object" && "message" in input && typeof (input as any).message === "string") {
    raw = (input as { message: string }).message;
  } else {
    raw = JSON.stringify(input ?? "");
  }

  // 1. If the input contains EntryPoint revert bytes, decode them.
  if (raw.includes("0x")) {
    const hexMatch = raw.match(/0x[0-9a-fA-F]+/g);
    for (const h of hexMatch ?? []) {
      if (h.length >= 10) {
        const dec = decodeEntryPointError(h);
        if (dec.kind !== "unknown") {
          out.push(buildExplanationFromEntryPoint(dec));
        }
      }
    }
  }

  // 2. Parse AA code from the human-readable reason.
  const aa = parseAACode(raw);
  if (aa) {
    out.push({
      id: `aa-${aa.code.toLowerCase()}`,
      title: `${aa.code}: ${aa.message}`,
      layer: "account_abstraction",
      category: `userop_${aa.category}`,
      summary: `ERC-4337 EntryPoint rejected the UserOperation with ${aa.code} (${aa.message}).`,
      rootCauseKnown: aa.category !== "unknown",
      likelyCauses: causesFor(aa.code),
      nextSteps: stepsFor(aa.code),
      retryHelpful: "no",
      increasingGasHelpful: aa.category === "gas" ? "yes" : "sometimes",
      confidence: "high",
      evidence: [{ type: "aa_code", value: aa.code }],
      references: [{ label: "ERC-4337", url: "https://eips.ethereum.org/EIPS/eip-4337" }],
    });
  }

  // 3. Defer to the general explainer for catalog matches.
  if (out.length === 0) {
    const { explanations } = explain(input);
    return explanations;
  }
  return out;
}

function buildExplanationFromEntryPoint(dec: ReturnType<typeof decodeEntryPointError>): Explanation {
  const title = dec.kind === "FailedOpWithRevert"
    ? `FailedOpWithRevert(${dec.opIndex}, "${dec.reason}")`
    : `FailedOp(${dec.opIndex}, "${dec.reason}")`;
  const inner = dec.innerDecoded;
  const causes: string[] = [];
  if (dec.aaCode) causes.push(`${dec.aaCode.code}: ${dec.aaCode.message}`);
  if (inner?.reason) causes.push(`Inner revert: "${inner.reason}"`);
  if (inner?.panicMeaning) causes.push(`Inner panic: ${inner.panicMeaning}`);
  if (inner?.name) causes.push(`Inner custom error: ${inner.name}`);
  return {
    id: "aa-failed-op-decoded",
    title,
    layer: "account_abstraction",
    category: "userop_validation",
    summary: `Decoded EntryPoint ${dec.kind}. Reason "${dec.reason}". ${inner ? `Inner revert kind: ${inner.kind}.` : ""}`,
    rootCauseKnown: true,
    likelyCauses: causes.length ? causes : ["See decoded EntryPoint payload."],
    nextSteps: [
      "Look up the AAxx code in the AA reference.",
      "If inner revert data is present, treat it as a normal revert: decode with the contract's ABI.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "sometimes",
    confidence: "high",
    evidence: [
      { type: "abi", value: dec.kind, source: "erc-4337-entrypoint" },
      ...(dec.aaCode ? [{ type: "aa_code" as const, value: dec.aaCode.code }] : []),
    ],
    decoded: inner,
  };
}

function causesFor(code: string): string[] {
  switch (code) {
    case "AA21": return ["Smart account has no ETH and no paymaster is covering this UserOp.", "Gas limits over-allocated by the bundler."];
    case "AA23": return ["validateUserOp reverted (signature, custom policy, session-key expired).", "verificationGasLimit too low."];
    case "AA24": return ["Wrong signer / wrong domain / wrong chainId / wrong EntryPoint address."];
    case "AA25": return ["Local nonce drift; reuse of the same 2D nonce key."];
    case "AA31": return ["Paymaster's deposit at the EntryPoint is below the required amount."];
    case "AA33": return ["Paymaster policy rejected the op (allowlist, spending cap, signature).", "verificationGasLimit too low for paymaster logic."];
    default: return [`See ERC-4337 spec for the precise meaning of ${code}.`];
  }
}

function stepsFor(code: string): string[] {
  switch (code) {
    case "AA21": return ["Fund the smart account, or attach a paymaster.", "Lower gas limits if they were inflated."];
    case "AA23": return ["Bump verificationGasLimit.", "If a FailedOpWithRevert is available, decode the inner bytes."];
    case "AA24": return ["Recompute userOpHash with the correct EntryPoint version, chainId, and signer."];
    case "AA25": return ["Read EntryPoint.getNonce(sender, key) and use that nonce."];
    case "AA31": return ["Top up paymaster deposit via EntryPoint.depositTo."];
    case "AA33": return ["Decode inner revert bytes; check paymaster-policy preconditions."];
    default: return ["Consult the ERC-4337 EntryPoint source for this code."];
  }
}
