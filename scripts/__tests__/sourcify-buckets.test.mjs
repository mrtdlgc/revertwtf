import assert from "node:assert/strict";

import { BUCKET_IDS, classifySignature, renderSourcifyEntry } from "../sourcify-buckets.mjs";

const SAMPLES = [
  ["OnlyOwner()", "access-control"],
  ["ERC20InsufficientAllowance(address,uint256,uint256)", "allowance-approval"],
  ["ZeroAddress()", "arg-validation"],
  ["OrderNotFillable(bytes32)", "auction-order"],
  ["InsufficientBalance(address,uint256)", "balance-funds"],
  ["MessageAlreadyProcessed(bytes32)", "bridge-cross-chain"],
  ["WrongChainId(uint256)", "chain-domain-mismatch"],
  ["DeadlineExpired(uint256)", "deadline-expiry"],
  ["NameNotRegistered(bytes32)", "domain-resolver"],
  ["SnapshotMissing(uint256)", "epoch-snapshot"],
  ["FeeTooHigh(uint256)", "fees-royalty"],
  ["GasLimitTooLow(uint256)", "gas"],
  ["AlreadyVoted(address)", "governance-voting"],
  ["HealthFactorTooLow(uint256)", "lending-collateral"],
  ["NotLiquidatable(address)", "liquidation"],
  ["SafeCastOverflowedUintDowncast(uint8,uint256)", "math"],
  ["InvalidProof(bytes32)", "merkle-proof"],
  ["ModuleNotInstalled(address)", "module-hook-plugin"],
  ["NonceUsed(uint256)", "nonce-replay"],
  ["StalePrice(uint256)", "oracle-feed"],
  ["EnforcedPaused()", "pause-emergency"],
  ["AlreadyInitialized()", "proxy-init"],
  ["RateLimitExceeded(uint256)", "rate-limit-cap"],
  ["AlreadyClaimed(address,uint256)", "refund-claim"],
  ["ReentrancyGuardReentrantCall()", "reentrancy"],
  ["SelectorNotPermitted(bytes4)", "session-permissions"],
  ["InvalidSignature()", "signature-712"],
  ["InsufficientOutputAmount(uint256,uint256)", "slippage-price"],
  ["CooldownActive(uint256)", "staking-rewards"],
  ["WrongState(uint8)", "state-machine"],
  ["PoolNotInitialized()", "swap-pool"],
  ["ERC4626ExceededMaxWithdraw(address,uint256,uint256)", "token-erc4626"],
  ["TransferRestricted(address)", "transfer-restriction"],
  ["MaxSharesExceeded(uint256)", "vault-share"],
  ["NotWhitelisted(address)", "whitelist-allowlist"],
  ["A0()", "unclassified"],
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("all declared Sourcify buckets have representative classification coverage", () => {
  const covered = new Set();
  for (const [signature, expected] of SAMPLES) {
    const actual = classifySignature(signature).id;
    covered.add(actual);
    assert.equal(actual, expected, signature);
  }

  for (const id of BUCKET_IDS) {
    assert.ok(covered.has(id), `missing sample for ${id}`);
  }
});

test("rendered entries use bucket-specific copy and attribution", () => {
  const entry = renderSourcifyEntry({
    signature: "OnlyOwner()",
    selector: "0x5fc483c5",
    attributions: [
      {
        chain: "ethereum",
        address: "0x0000000000000000000000000000000000000001",
        contractName: "ExampleOwnerVault",
        repoUrl: "https://repo.sourcify.dev/1/0x0000000000000000000000000000000000000001",
      },
    ],
  });

  assert.equal(entry.source, "sourcify-signatures");
  assert.equal(entry.category, "custom_error");
  assert.equal(entry.confidence, "high");
  assert.match(entry.title, /Access denied/);
  assert.doesNotMatch(entry.summary, /signature candidate/i);
  assert.ok(entry.references?.some((reference) => reference.label.includes("ExampleOwnerVault")));
  assert.ok(entry.examples?.some((example) => example.includes("seen in ExampleOwnerVault")));
});

test("unclassified entries stay low confidence", () => {
  const entry = renderSourcifyEntry({ signature: "A0()", selector: "0x5cc23f7d" });
  assert.equal(classifySignature("A0()").id, "unclassified");
  assert.equal(entry.confidence, "low");
  assert.equal(entry.rootCauseKnown, false);
});
