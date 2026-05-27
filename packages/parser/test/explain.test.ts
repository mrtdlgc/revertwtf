import { describe, expect, it } from "vitest";
import { explain } from "../src/explain.js";
import { encodeAbiParameters, type Hex } from "viem";

function makeErrorString(reason: string): Hex {
  const body = encodeAbiParameters([{ type: "string" }], [reason]);
  return `0x08c379a0${body.slice(2)}` as Hex;
}

describe("explain", () => {
  it("explains ethers could-not-coalesce", () => {
    const r = explain({ code: "UNKNOWN_ERROR", message: "could not coalesce error" });
    expect(r.explanations.find((e) => e.id === "ethers-v6-could-not-coalesce-error")).toBeTruthy();
  });

  it("explains -32603 with nested revert", () => {
    const e = {
      code: -32603,
      message: "Internal JSON-RPC error",
      data: { code: 3, data: "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004beef00000000000000000000000000000000000000000000000000000000000000" },
    };
    const r = explain(e);
    expect(r.explanations.find((e) => e.id === "rpc-internal-error-32603")).toBeTruthy();
    expect(r.decoded.length).toBeGreaterThan(0);
  });

  it("explains AA23", () => {
    const r = explain({ message: 'FailedOp(0, "AA23 reverted or OOG")' });
    expect(r.explanations.find((e) => e.id === "aa23-reverted-or-oog")).toBeTruthy();
  });

  it("explains user rejection", () => {
    const r = explain({ code: 4001, message: "User rejected the request" });
    expect(r.explanations.find((e) => e.id === "eip1193-4001-user-rejected")).toBeTruthy();
  });

  it("ranks specific messages ahead of broad RPC codes", () => {
    const r = explain({ code: -32000, message: "nonce too high" });
    expect(r.explanations[0]?.id).toBe("ethereum-protocol-tx-nonce-too-high");
  });

  it("prioritizes base Ethereum protocol errors over node wording", () => {
    const r = explain({ code: -32000, message: "invalid opcode: INVALID" });
    expect(r.explanations[0]?.id).toBe("ethereum-protocol-evm-invalid-opcode");
    expect(r.explanations[0]?.references?.[0]?.label).toContain("go-ethereum");
  });

  it("explains current protocol transaction envelopes", () => {
    const blob = explain({ code: -32000, message: "max fee per blob gas less than block blob gas fee" });
    expect(blob.explanations[0]?.id).toBe("ethereum-protocol-blob-fee-cap-too-low");

    const auth = explain({ code: -32000, message: "EIP-7702 transaction with empty auth list" });
    expect(auth.explanations[0]?.id).toBe("ethereum-protocol-set-code-empty-auth-list");
  });

  it("explains newly covered protocol selectors and exact reasons", () => {
    const stargate = explain("0x262c503d");
    expect(stargate.explanations.find((e) => e.id === "stargate-bus-codec-invalid-bus-bytes-length")).toBeTruthy();

    const circle = explain("execution reverted: Amount must be nonzero");
    expect(circle.explanations[0]?.id).toBe("circle-cctp-amount-must-be-nonzero");

    const euler = explain("0x34373fbc");
    expect(euler.explanations.find((e) => e.id === "euler-e-account-liquidity")).toBeTruthy();
  });

  it("explains Base and Gnosis ecosystem coverage", () => {
    const base = explain("0x23369fa6");
    expect(base.explanations.find((e) => e.id === "base-already-exists")).toBeTruthy();

    const conditionalTokens = explain("execution reverted: condition already prepared");
    expect(conditionalTokens.explanations[0]?.id).toBe("gnosis-conditional-tokens-condition-already-prepared");

    const zodiac = explain("0x20618973");
    expect(zodiac.explanations.find((e) => e.id === "zodiac-already-enabled-module-address")).toBeTruthy();
  });

  it("explains broader EVM ecosystem coverage", () => {
    const polygonZkevm = explain("0x5a568e68");
    expect(polygonZkevm.explanations.find((e) => e.id === "polygon-zkevm-access-control-only-can-renounce-roles-for-self")).toBeTruthy();

    const pancake = explain("0x68214017");
    expect(pancake.explanations.find((e) => e.id === "pancakeswap-amount-specified-is-zero")).toBeTruthy();

    const gmx = explain("0xb244a107");
    expect(gmx.explanations.find((e) => e.id === "gmx-action-already-signalled")).toBeTruthy();

    const scroll = explain("0x85bd908d");
    expect(scroll.explanations.find((e) => e.id === "scroll-error-caller-is-not-messenger")).toBeTruthy();
  });

  it("explains x402 payment and facilitator failures", () => {
    const paymentRequired = explain({
      x402Version: 2,
      error: "PAYMENT-SIGNATURE header is required",
      accepts: [{ scheme: "exact", network: "eip155:8453" }],
    });
    expect(paymentRequired.explanations.find((e) => e.id === "x402-payment-signature-required")).toBeTruthy();

    const invalidSignature = explain({
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_signature",
      invalidMessage: "EVM signature verification failed",
    });
    expect(invalidSignature.explanations[0]?.id).toBe("x402-invalid-exact-evm-payload-signature");

    const svm = explain({
      success: false,
      errorReason: "invalid_exact_svm_payload_transaction_fee_payer_transferring_funds",
    });
    expect(svm.explanations[0]?.id).toBe("x402-invalid-exact-svm-payload-transaction-fee-payer-transferring-funds");
  });

  it("uses required code guards for -32000 message details", () => {
    const r = explain({ code: -32000, message: "gas required exceeds allowance or always failing transaction" });
    expect(r.explanations[0]?.id).toBe("rpc-32000-gas-required-exceeds-allowance-or-always-failing-transaction");

    const messageOnly = explain("gas required exceeds allowance or always failing transaction");
    expect(
      messageOnly.explanations.find((e) => e.id === "rpc-32000-gas-required-exceeds-allowance-or-always-failing-transaction"),
    ).toBeFalsy();
  });

  it("does not match generated exact reasons as broad substrings", () => {
    const r = explain({ code: -32000, message: "nonce too low" });
    const ids = r.explanations.map((e) => e.id);
    expect(ids).toContain("nonce-too-low");
    expect(ids).not.toContain("ens-a");
    expect(ids).not.toContain("ens-c");
  });

  it("does not match generated custom errors without selector evidence", () => {
    const r = explain("execution reverted: SafeMath: subtraction overflow");
    const ids = r.explanations.map((e) => e.id);
    expect(ids).toContain("protocol-revert-safe-math-subtraction-overflow");
    expect(ids).not.toContain("solady-overflow");
  });

  it("explains failed simulation trace frames", () => {
    const r = explain({
      simulation: { status: "failed" },
      trace: [
        {
          type: "CALL",
          to: "0xToken",
          contractName: "USDC",
          functionName: "transferFrom",
          error: "execution reverted",
          output: makeErrorString("ERC20: transfer amount exceeds balance"),
        },
      ],
    });

    expect(r.explanations[0]?.id).toBe("trace-failed-call");
    expect(r.explanations[0]?.title).toMatch(/transferFrom/);
    expect(r.decoded[0]?.result.kind).toBe("error_string");
    expect(r.decoded[0]?.result.reason).toBe("ERC20: transfer amount exceeds balance");
  });

  it("decodes raw revert-data strings", () => {
    const r = explain("0x4e487b710000000000000000000000000000000000000000000000000000000000000011");
    expect(r.decoded[0]?.result.kind).toBe("panic");
    expect(r.explanations[0]?.id).toBe("decoded-panic");
  });

  it("returns unknown fallback for empty input", () => {
    const r = explain({});
    expect(r.explanations[0]?.id).toBe("unknown");
  });

  it("accepts a raw string", () => {
    const r = explain("execution reverted: Ownable: caller is not the owner");
    expect(r.explanations.find((e) => e.id === "ownable-not-owner")).toBeTruthy();
  });

  it("caps oversized string input without unbounded work", () => {
    const huge = "x".repeat(5_000_000) + " execution reverted: Ownable: caller is not the owner";
    const start = Date.now();
    const r = explain(huge);
    expect(Date.now() - start).toBeLessThan(2_500);
    expect(r.normalized.messages[0]?.value.length).toBeLessThanOrEqual(4_000);
  });

  it("caps oversized message fields nested in objects", () => {
    const r = explain({ message: "y".repeat(5_000_000) });
    expect(r.normalized.messages.every((m) => m.value.length <= 4_000)).toBe(true);
  });
});
