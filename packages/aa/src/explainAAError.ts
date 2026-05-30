import type { Explanation, Helpfulness, Reference } from "@revertwtf/core";
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
      summary: summaryFor(aa.code, aa.message),
      rootCauseKnown: rootCauseKnownFor(aa.code, aa.category),
      likelyCauses: causesFor(aa.code),
      nextSteps: stepsFor(aa.code),
      retryHelpful: retryHelpfulFor(aa.code),
      increasingGasHelpful: gasHelpfulFor(aa.code, aa.category),
      confidence: "high",
      evidence: [{ type: "aa_code", value: aa.code }],
      references: referencesFor(aa.code),
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
  const causes: string[] = dec.aaCode ? causesFor(dec.aaCode.code) : [];
  if (inner?.reason) causes.push(`Inner revert: "${inner.reason}"`);
  if (inner?.panicMeaning) causes.push(`Inner panic: ${inner.panicMeaning}`);
  if (inner?.name) causes.push(`Inner custom error: ${inner.name}`);
  const nextSteps = dec.aaCode ? stepsFor(dec.aaCode.code) : ["Look up the AAxx code in the AA reference."];
  if (inner) {
    nextSteps.push("Treat the inner revert as the contract-specific root cause and decode it with the account, factory, or paymaster ABI.");
  }
  return {
    id: "aa-failed-op-decoded",
    title,
    layer: "account_abstraction",
    category: "userop_validation",
    summary: dec.aaCode
      ? `Decoded EntryPoint ${dec.kind}: ${summaryFor(dec.aaCode.code, dec.aaCode.message)}${inner ? ` Inner revert kind: ${inner.kind}.` : ""}`
      : `Decoded EntryPoint ${dec.kind}. Reason "${dec.reason}".${inner ? ` Inner revert kind: ${inner.kind}.` : ""}`,
    rootCauseKnown: Boolean(inner) || (dec.aaCode ? rootCauseKnownFor(dec.aaCode.code, dec.aaCode.category) : true),
    likelyCauses: causes.length ? causes : ["See decoded EntryPoint payload."],
    nextSteps,
    retryHelpful: dec.aaCode ? retryHelpfulFor(dec.aaCode.code) : "no",
    increasingGasHelpful: dec.aaCode ? gasHelpfulFor(dec.aaCode.code, dec.aaCode.category) : "sometimes",
    confidence: "high",
    evidence: [
      { type: "abi", value: dec.kind, source: "erc-4337-entrypoint" },
      ...(dec.aaCode ? [{ type: "aa_code" as const, value: dec.aaCode.code }] : []),
    ],
    decoded: inner,
    references: dec.aaCode ? referencesFor(dec.aaCode.code) : [{ label: "ERC-4337 error codes", url: "https://eips.ethereum.org/EIPS/eip-4337#error-codes" }],
  };
}

function summaryFor(code: string, message: string): string {
  switch (code) {
    case "AA21": return "The sender could not prefund the UserOperation through its EntryPoint deposit or native balance, and no valid paymaster funding path covered the operation.";
    case "AA23": return "The smart account's validateUserOp path reverted or exhausted validation gas.";
    case "AA24": return "The account rejected the UserOperation signature for this hash, EntryPoint address, chain id, signer, or account signature scheme.";
    case "AA25": return "The UserOperation nonce is not the nonce the EntryPoint/account expects for this sender and nonce key.";
    case "AA31": return "The selected paymaster does not have enough EntryPoint deposit to prefund the sponsored UserOperation.";
    case "AA33": return "The paymaster's validatePaymasterUserOp path reverted or exhausted its validation gas.";
    case "AA94": return "One or more gas-related UserOperation fields exceed the numeric range that the EntryPoint can safely pack and validate.";
    case "AA96": return "The signature aggregator address is invalid or reserved, so the EntryPoint cannot use it to validate aggregated signatures.";
    default: return `ERC-4337 EntryPoint rejected the UserOperation with ${code} (${message}).`;
  }
}

function rootCauseKnownFor(code: string, category: string): boolean {
  if (category === "unknown") return false;
  return !["AA13", "AA23", "AA33", "AA50"].includes(code);
}

function causesFor(code: string): string[] {
  switch (code) {
    case "AA10": return ["The sender smart account already has code deployed, but the UserOperation still includes deployment data."];
    case "AA13": return ["The factory/initCode reverted, ran out of gas, or could not complete account creation."];
    case "AA14": return ["The factory returned an address that does not match the UserOperation sender."];
    case "AA15": return ["The factory/initCode finished without deploying contract code at the sender address."];
    case "AA20": return ["The sender account is not deployed and EntryPoint v0.6 did not receive initCode to deploy it."];
    case "AA21": return ["The smart account lacks enough native token or EntryPoint deposit to cover prefund.", "Sponsorship was expected, but valid paymaster data is missing or malformed."];
    case "AA22": return ["The account validation window is expired or not yet active for the current block timestamp."];
    case "AA23": return ["validateUserOp reverted because of signature, policy, module, session, prefund, or account state.", "verificationGasLimit may be too low for account validation."];
    case "AA24": return ["Wrong signer, userOpHash, EntryPoint address, chain id, or account signature envelope."];
    case "AA25": return ["A nonce was reused, formatted incorrectly, or submitted out of sequence for the sender/key."];
    case "AA26": return ["EntryPoint v0.7/v0.8 account or paymaster validation exceeded verificationGasLimit."];
    case "AA30": return ["EntryPoint v0.6 paymasterAndData points to a paymaster address with no deployed code."];
    case "AA31": return ["The paymaster's EntryPoint deposit is below the required prefund."];
    case "AA32": return ["The paymaster validity window is expired or not yet active."];
    case "AA33": return ["Paymaster policy rejected the operation, paymaster data is malformed, or validation gas is too low."];
    case "AA34": return ["The paymaster authorization or signature validation failed."];
    case "AA36": return ["EntryPoint v0.7/v0.8 paymaster validation exceeded paymasterVerificationGasLimit."];
    case "AA40": return ["EntryPoint v0.6 account or paymaster verification exceeded verificationGasLimit."];
    case "AA41": return ["EntryPoint v0.6 could not complete verification within the supplied gas budget."];
    case "AA50": return ["The paymaster postOp hook reverted after execution."];
    case "AA51": return ["The actual gas cost exceeded the prefund available from the account or paymaster deposit."];
    case "AA90": return ["The beneficiary supplied to handleOps is zero or invalid."];
    case "AA91": return ["EntryPoint could not transfer collected fees to the beneficiary address."];
    case "AA92": return ["An internal EntryPoint helper was called directly from outside the EntryPoint."];
    case "AA93": return ["The paymaster data is missing, too short, malformed, or packed for the wrong EntryPoint version."];
    case "AA94": return ["A gas or fee field is too large for the EntryPoint's internal bounds."];
    case "AA95": return ["The EntryPoint handleOps execution or one of its sub-calls ran out of gas."];
    case "AA96": return ["The signature aggregator address is invalid, reserved, or incompatible with the account."];
    default: return [`See ERC-4337 spec for the precise meaning of ${code}.`];
  }
}

function stepsFor(code: string): string[] {
  switch (code) {
    case "AA10": return ["Remove initCode or v0.7/v0.8 factory fields when submitting from an already deployed account."];
    case "AA13": return ["Verify factory address/calldata and trace the factory call; raise verificationGasLimit only if it is actually out of gas."];
    case "AA14": return ["Recompute the counterfactual sender from the exact factory address, salt, owner, and initialization calldata."];
    case "AA15": return ["Check that the factory deploys code at the sender address and returns that same address."];
    case "AA20": return ["Check sender code on the target chain and include valid initCode for a first v0.6 UserOperation."];
    case "AA21": return ["Fund the smart account or EntryPoint deposit, or attach fresh paymaster data for this EntryPoint version."];
    case "AA22": return ["Compare validAfter/validUntil with the current block timestamp and create a fresh authorization if expired."];
    case "AA23": return ["Decode inner revert bytes if available, then re-estimate validation gas with the final signature and paymaster data."];
    case "AA24": return ["Recompute userOpHash with the target EntryPoint address and chain id, then regenerate the account signature."];
    case "AA25": return ["Read EntryPoint.getNonce(sender, key) immediately before building the UserOperation."];
    case "AA26": return ["Re-run UserOperation gas estimation and adjust verificationGasLimit after finalizing all fields."];
    case "AA30": return ["Decode paymasterAndData and verify the first 20 bytes point to deployed paymaster code on this chain."];
    case "AA31": return ["Top up the paymaster deposit or request fresh sponsorship from the paymaster service."];
    case "AA32": return ["Request fresh paymaster data and submit within the paymaster's validity window."];
    case "AA33": return ["Decode inner revert bytes if present, regenerate paymaster data, and increase paymaster verification gas only for real OOG."];
    case "AA34": return ["Check the paymaster signature/authorization format for the EntryPoint version and request fresh paymaster data."];
    case "AA36": return ["Increase paymasterVerificationGasLimit or simplify the paymaster validation path after tracing."];
    case "AA40": return ["Re-run v0.6 gas estimation and trace account/paymaster verification if verificationGasLimit is unexpectedly high."];
    case "AA41": return ["Raise verificationGasLimit after estimating with the same account state, signature, and paymaster data."];
    case "AA50": return ["Trace the paymaster postOp call and check token balances, allowances, prices, and policy state."];
    case "AA51": return ["Top up the sender or paymaster deposit and re-estimate gas and fee fields immediately before submission."];
    case "AA90": return ["Set a non-zero beneficiary address that can receive the EntryPoint payout."];
    case "AA91": return ["Use a beneficiary that accepts ETH or report the payout failure to the bundler operator."];
    case "AA92": return ["Call the public EntryPoint method for the workflow instead of an internal helper."];
    case "AA93": return ["Regenerate paymaster fields for the exact EntryPoint version and verify paymaster data length/packing."];
    case "AA94": return ["Remove unrealistic gas overrides and ensure gas fields fit within EntryPoint bounds."];
    case "AA95": return ["Identify whether validation, execution, or postOp exhausted gas, then re-estimate and adjust the relevant limit."];
    case "AA96": return ["Use a valid ERC-4337 aggregator address or remove aggregator data if the account validates signatures directly."];
    default: return ["Consult the ERC-4337 EntryPoint source for this code."];
  }
}

function retryHelpfulFor(code: string): Helpfulness {
  if (code === "AA22" || code === "AA25" || code === "AA32" || code === "AA95") return "sometimes";
  return "no";
}

function gasHelpfulFor(code: string, category: string): Helpfulness {
  if (["AA13", "AA23", "AA33", "AA51"].includes(code)) return "sometimes";
  if (category === "gas" || code === "AA36") return "yes";
  return "no";
}

function referencesFor(code: string): Reference[] {
  const refs: Reference[] = [];
  if (["AA10", "AA13", "AA14", "AA15", "AA21", "AA22", "AA23", "AA24", "AA25", "AA26", "AA31", "AA32", "AA33", "AA34", "AA36", "AA90", "AA91", "AA92", "AA93", "AA94", "AA95", "AA96"].includes(code)) {
    refs.push({ label: "Alchemy EntryPoint v0.7/v0.8 revert codes", url: "https://www.alchemy.com/docs/wallets/reference/entrypoint-v07-revert-codes" });
  }
  if (["AA10", "AA13", "AA14", "AA15", "AA20", "AA21", "AA22", "AA23", "AA24", "AA25", "AA30", "AA31", "AA32", "AA33", "AA34", "AA40", "AA41", "AA50", "AA51", "AA90", "AA91", "AA92", "AA93", "AA94", "AA95", "AA96"].includes(code)) {
    refs.push({ label: "Alchemy EntryPoint v0.6 revert codes", url: "https://www.alchemy.com/docs/wallets/reference/entrypoint-v06-revert-codes" });
  }
  refs.push({ label: "ERC-4337 error codes", url: "https://eips.ethereum.org/EIPS/eip-4337#error-codes" });
  return refs;
}
