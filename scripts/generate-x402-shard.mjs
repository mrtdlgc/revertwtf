import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const outPath = resolve("packages/catalog/src/data/shards/core/x402.json");

const refs = {
  http: { label: "x402 HTTP 402", url: "https://docs.x402.org/core-concepts/http-402" },
  spec: {
    label: "x402 protocol specification v2",
    url: "https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md",
  },
  evm: {
    label: "x402 exact EVM scheme",
    url: "https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md",
  },
  troubleshooting: {
    label: "Coinbase x402 troubleshooting",
    url: "https://docs.cdp.coinbase.com/x402/support/troubleshooting",
  },
  verify: {
    label: "Coinbase x402 verify API",
    url: "https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/verify-payment",
  },
  settle: {
    label: "Coinbase x402 settle API",
    url: "https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/settle-payment",
  },
};

function codePatterns(code) {
  return [
    { type: "json_path", path: "invalidReason", equals: code },
    { type: "json_path", path: "errorReason", equals: code },
    { type: "json_path", path: "data.invalidReason", equals: code },
    { type: "json_path", path: "data.errorReason", equals: code },
    { type: "json_path", path: "error.invalidReason", equals: code },
    { type: "json_path", path: "error.errorReason", equals: code },
    { type: "json_path", path: "error.data.invalidReason", equals: code },
    { type: "json_path", path: "error.data.errorReason", equals: code },
    { type: "substring", value: code },
  ];
}

function entry(def) {
  return {
    id: `x402-${def.code.replaceAll("_", "-")}`,
    title: `x402: ${def.title}`,
    layer: def.layer ?? "protocol",
    source: "x402",
    category: def.category,
    patterns: def.patterns ?? codePatterns(def.code),
    ...(def.requires ? { requires: def.requires } : {}),
    summary: def.summary,
    rootCauseKnown: def.rootCauseKnown ?? true,
    likelyCauses: def.likelyCauses,
    nextSteps: def.nextSteps,
    retryHelpful: def.retryHelpful ?? "no",
    increasingGasHelpful: def.increasingGasHelpful ?? "no",
    confidence: def.confidence ?? "high",
    references: def.references ?? [refs.spec, refs.troubleshooting],
    ...(def.examples ? { examples: def.examples } : {}),
    ...(def.related ? { related: def.related } : {}),
  };
}

const entries = [
  {
    id: "x402-http-402-payment-required",
    title: "x402: HTTP 402 Payment Required",
    layer: "protocol",
    source: "x402",
    category: "payment_required",
    patterns: [
      { type: "json_path", path: "x402Version", equals: 2 },
      { type: "json_path", path: "data.x402Version", equals: 2 },
      { type: "json_path", path: "body.x402Version", equals: 2 },
      { type: "substring", value: "402 Payment Required" },
      { type: "substring", value: "PAYMENT-REQUIRED" },
    ],
    summary:
      "The resource is protected by x402 and is asking the client to complete the in-band payment flow before retrying the same request.",
    rootCauseKnown: true,
    likelyCauses: [
      "The first request did not include a usable PAYMENT-SIGNATURE header.",
      "The server returned a PAYMENT-REQUIRED header or PaymentRequired body with accepted schemes, network, asset, amount, and payTo details.",
    ],
    nextSteps: [
      "Decode the PAYMENT-REQUIRED value as base64 JSON and choose a supported payment requirement.",
      "Create a payment payload for the selected scheme/network, attach it as PAYMENT-SIGNATURE, and retry the same request.",
      "If a retry still returns 402, inspect the response error, invalidReason, or errorReason field for the concrete failure.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [refs.http, refs.spec],
    examples: [
      "{\"status\":402,\"message\":\"x402 402 Payment Required\",\"x402Version\":2}",
      "{\"x402Version\":2,\"error\":\"PAYMENT-SIGNATURE header is required\",\"accepts\":[{\"scheme\":\"exact\",\"network\":\"eip155:8453\"}]}",
    ],
  },
  {
    id: "x402-payment-signature-required",
    title: "x402: PAYMENT-SIGNATURE header is required",
    layer: "protocol",
    source: "x402",
    category: "payment_required",
    patterns: [
      { type: "substring", value: "PAYMENT-SIGNATURE header is required" },
      { type: "substring", value: "payment signature header is required" },
      { type: "substring", value: "missing payment-signature" },
    ],
    summary:
      "The server received an unpaid x402 request and could not find the signed payment payload in the PAYMENT-SIGNATURE header.",
    rootCauseKnown: true,
    likelyCauses: [
      "The client made the initial discovery request and has not retried with a payment yet.",
      "The payment payload was generated but attached under the wrong header name.",
    ],
    nextSteps: [
      "Read the PAYMENT-REQUIRED header/body and create a PaymentPayload for one accepted requirement.",
      "Attach the base64-encoded PaymentPayload as PAYMENT-SIGNATURE on the retry request.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [refs.http, refs.spec],
  },
  {
    id: "x402-legacy-x-payment-header",
    title: "x402: Legacy X-PAYMENT header used",
    layer: "protocol",
    source: "x402",
    category: "payment_required",
    patterns: [
      { type: "substring", value: "Using legacy X-PAYMENT" },
      { type: "substring", value: "legacy X-PAYMENT" },
      { type: "substring", value: "Wrong header name: Using legacy X-PAYMENT" },
    ],
    summary:
      "The integration is using the legacy X-PAYMENT header where current x402 V2 HTTP flow expects PAYMENT-SIGNATURE.",
    rootCauseKnown: true,
    likelyCauses: [
      "The client mixes older x402 examples or v1 package behavior with the V2 HTTP header contract.",
      "A proxy, SDK wrapper, or custom fetch interceptor renamed the header before sending the retry.",
    ],
    nextSteps: [
      "Send the signed payment payload in PAYMENT-SIGNATURE.",
      "Use one x402 package generation consistently; avoid mixing v1 and v2 SDK imports in the same process.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [refs.http, refs.troubleshooting],
  },
  {
    id: "x402-payment-required-header-malformed",
    title: "x402: Malformed PAYMENT-REQUIRED header",
    layer: "protocol",
    source: "x402",
    category: "payment_required",
    patterns: [
      { type: "substring", value: "Malformed PAYMENT-REQUIRED" },
      { type: "substring", value: "PAYMENT-REQUIRED header is invalid" },
      { type: "substring", value: "Failed to decode PAYMENT-REQUIRED" },
    ],
    summary:
      "The server's x402 payment requirement header could not be decoded as valid base64 JSON with the expected PaymentRequired shape.",
    rootCauseKnown: true,
    likelyCauses: [
      "The resource server emitted raw JSON or truncated base64 instead of base64-encoded JSON.",
      "An HTTP gateway folded, stripped, or rewrote the PAYMENT-REQUIRED header.",
    ],
    nextSteps: [
      "Log the exact response headers before any client middleware parses them.",
      "Validate that the decoded object includes x402Version, resource, accepts, and any advertised extensions.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "no",
    confidence: "medium",
    references: [refs.http, refs.spec],
  },
  {
    id: "x402-payment-signature-header-malformed",
    title: "x402: Malformed PAYMENT-SIGNATURE header",
    layer: "protocol",
    source: "x402",
    category: "payment_payload",
    patterns: [
      { type: "substring", value: "Malformed PAYMENT-SIGNATURE" },
      { type: "substring", value: "PAYMENT-SIGNATURE header is invalid" },
      { type: "substring", value: "Failed to decode PAYMENT-SIGNATURE" },
    ],
    summary:
      "The payment retry included a PAYMENT-SIGNATURE header, but the server could not decode it as a valid x402 PaymentPayload.",
    rootCauseKnown: true,
    likelyCauses: [
      "The header is not base64-encoded JSON.",
      "The payload was serialized with the wrong schema version or missing required payment fields.",
    ],
    nextSteps: [
      "Decode the header locally and compare it with the PaymentPayload schema for the x402Version you are using.",
      "Regenerate the payment payload from the same PaymentRequired object returned by the server.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [refs.http, refs.spec],
  },
  {
    id: "x402-no-scheme-registered",
    title: "x402: No scheme registered",
    layer: "library",
    source: "x402",
    category: "scheme_registration",
    patterns: [
      { type: "substring", value: "No scheme registered" },
      { type: "substring", value: "doesn't have a payment scheme registered" },
      { type: "substring", value: "does not have a payment scheme registered" },
    ],
    summary:
      "The client or resource server does not have an x402 payment scheme implementation registered for the requested network.",
    rootCauseKnown: true,
    likelyCauses: [
      "The exact EVM/SVM scheme registration was never called.",
      "The integration uses a legacy network name instead of a CAIP-2 network identifier such as eip155:8453.",
    ],
    nextSteps: [
      "Register the scheme implementation for the target network before creating or verifying payments.",
      "Normalize network IDs to CAIP-2 format and confirm the facilitator supports that network.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "no",
    confidence: "high",
    references: [refs.troubleshooting, refs.spec],
  },
  {
    id: "x402-mainnet-testnet-network-mismatch",
    title: "x402: Mainnet/testnet network mismatch",
    layer: "protocol",
    source: "x402",
    category: "network",
    patterns: [
      { type: "substring", value: "Base Sepolia" },
      { type: "substring", value: "eip155:84532" },
      { type: "substring", value: "eip155:8453" },
      { type: "substring", value: "testnet facilitator" },
    ],
    requires: [{ type: "substring", value: "x402" }],
    summary:
      "The x402 payment requirement, signer, wallet funds, or facilitator is pointed at a different network than the request expects.",
    rootCauseKnown: true,
    likelyCauses: [
      "The code works on Base Sepolia but is retrying the mainnet endpoint with testnet network IDs or testnet USDC.",
      "The selected facilitator supports testnet but not the requested mainnet network.",
    ],
    nextSteps: [
      "Use eip155:8453 for Base mainnet and eip155:84532 for Base Sepolia.",
      "Fund the payer on the same network and use a facilitator endpoint that supports that network.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "sometimes",
    confidence: "medium",
    references: [refs.troubleshooting],
  },
  entry({
    code: "insufficient_funds",
    title: "Insufficient funds",
    layer: "wallet",
    category: "facilitator_verify",
    summary:
      "The facilitator could not verify or settle the payment because the payer does not have enough of the required asset.",
    likelyCauses: [
      "The payer wallet lacks the required token amount on the target network.",
      "The wallet has testnet funds while the payment requirement targets mainnet, or vice versa.",
    ],
    nextSteps: [
      "Check the accepted asset, network, amount, and payer balance in atomic units.",
      "Fund the payer wallet with the required token on the same chain as the PaymentRequirements network.",
    ],
    retryHelpful: "no",
    increasingGasHelpful: "sometimes",
    references: [refs.verify, refs.settle, refs.troubleshooting],
  }),
  entry({
    code: "invalid_scheme",
    title: "Invalid payment scheme",
    category: "facilitator_verify",
    summary: "The requested x402 payment scheme is not valid or not accepted for this resource/facilitator.",
    likelyCauses: [
      "The PaymentPayload accepted.scheme does not match one of the server's accepted schemes.",
      "The integration sent a scheme identifier from another x402 version or custom extension.",
    ],
    nextSteps: [
      "Choose a scheme directly from the PaymentRequired accepts array.",
      "Confirm the facilitator /supported endpoint lists the same scheme and network pair.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "unsupported_scheme",
    title: "Unsupported payment scheme",
    category: "facilitator_verify",
    summary: "The payment scheme is syntactically recognizable but unsupported by the current facilitator.",
    likelyCauses: [
      "The resource advertises a scheme that this facilitator does not implement.",
      "The client selected an experimental scheme without registering its verifier/settler.",
    ],
    nextSteps: [
      "Call the facilitator /supported endpoint and intersect it with the resource's accepts array.",
      "Use a supported scheme or configure a facilitator that supports the advertised scheme.",
    ],
    references: [refs.spec],
  }),
  entry({
    code: "invalid_network",
    title: "Invalid network",
    category: "network",
    summary: "The x402 payment references a blockchain network that is unsupported or not in the expected CAIP-2 format.",
    likelyCauses: [
      "The integration used legacy names like base or base-sepolia instead of eip155:8453 or eip155:84532.",
      "The facilitator does not support the selected network.",
    ],
    nextSteps: [
      "Use CAIP-2 network IDs in PaymentRequirements and PaymentPayload.",
      "Check the facilitator /supported endpoint before choosing a payment requirement.",
    ],
    references: [refs.verify, refs.spec, refs.troubleshooting],
  }),
  entry({
    code: "invalid_x402_version",
    title: "Invalid x402 version",
    category: "schema",
    summary: "The payload or requirements use an x402 protocol version the verifier does not support.",
    likelyCauses: [
      "The client mixes v1 and v2 SDK packages.",
      "The request body shape matches one version while x402Version declares another.",
    ],
    nextSteps: [
      "Use one x402 SDK generation consistently.",
      "For V2, set x402Version to 2 and use the V2 PaymentRequired/PaymentPayload fields.",
    ],
    references: [refs.verify, refs.troubleshooting, refs.spec],
  }),
  entry({
    code: "invalid_payment_requirements",
    title: "Invalid payment requirements",
    category: "schema",
    summary: "The PaymentRequirements object is malformed or missing fields required by the selected scheme.",
    likelyCauses: [
      "The resource server emitted incomplete accepts entries.",
      "The verifier received a paymentRequirements object that differs from the one advertised to the client.",
    ],
    nextSteps: [
      "Validate scheme, network, amount, asset, payTo, and maxTimeoutSeconds.",
      "Pass the exact accepted requirement from PaymentRequired through verify/settle.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_payload",
    title: "Invalid payment payload",
    category: "schema",
    summary: "The PaymentPayload is malformed or does not match the selected x402 scheme and network.",
    likelyCauses: [
      "Required fields are missing, have the wrong type, or use the wrong v1/v2 shape.",
      "The accepted requirement inside the payload does not match the server's PaymentRequirements.",
    ],
    nextSteps: [
      "Compare the decoded PAYMENT-SIGNATURE payload against the spec for the declared x402Version.",
      "Regenerate the payload from the server's current PAYMENT-REQUIRED object.",
    ],
    references: [refs.verify, refs.troubleshooting, refs.spec],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_value",
    title: "EVM authorization value mismatch",
    category: "exact_evm",
    summary: "The EIP-3009 authorization value does not exactly match the payment requirement amount.",
    likelyCauses: [
      "The payload was signed for a different amount or token unit precision.",
      "The server changed pricing between discovery and retry.",
    ],
    nextSteps: [
      "Compare accepted.amount with payload.authorization.value in atomic token units.",
      "Fetch fresh payment requirements and sign a new payload if the price changed.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_value_too_low",
    title: "EVM authorization value too low",
    category: "exact_evm",
    summary: "The signed EVM payment amount is lower than the amount required for the resource.",
    likelyCauses: [
      "The client signed a stale lower price.",
      "The amount was converted with the wrong decimals.",
    ],
    nextSteps: [
      "Use the exact accepted.amount from PaymentRequired.",
      "Check token decimals and sign a new payment payload.",
    ],
    references: [refs.verify, refs.troubleshooting, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_valid_after",
    title: "EVM authorization not valid yet",
    category: "exact_evm",
    summary: "The EIP-3009 authorization validAfter timestamp is in the future.",
    likelyCauses: [
      "Client/server clocks are skewed.",
      "The authorization was created with a delayed start time.",
    ],
    nextSteps: [
      "Regenerate the authorization with a validAfter timestamp at or before the current time.",
      "Check local clock synchronization for the signing environment.",
    ],
    retryHelpful: "sometimes",
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_valid_before",
    title: "EVM authorization expired",
    category: "exact_evm",
    summary: "The EIP-3009 authorization validBefore timestamp has already passed.",
    likelyCauses: [
      "The client retried after the payment authorization expired.",
      "The signing machine clock or server clock is incorrect.",
    ],
    nextSteps: [
      "Fetch fresh payment requirements and sign a new payment payload.",
      "Increase the allowed payment window only if it is safe for the application.",
    ],
    retryHelpful: "yes",
    references: [refs.verify, refs.troubleshooting, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_typed_data_message",
    title: "EVM typed-data authorization mismatch",
    category: "exact_evm",
    summary: "The EIP-712 typed-data message reconstructed by the verifier does not match the expected authorization.",
    likelyCauses: [
      "The client signed a different domain, chain ID, token contract, recipient, amount, or nonce.",
      "The payload was modified after signing.",
    ],
    nextSteps: [
      "Rebuild the EIP-712 domain and TransferWithAuthorization message from the same accepted requirement.",
      "Check chain ID, asset address, payTo, value, validAfter, validBefore, and nonce byte length.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_from_address_kyt",
    title: "EVM payer address blocked by KYT",
    layer: "wallet",
    category: "compliance",
    summary: "The facilitator rejected the payer address due to Know Your Transaction or policy screening.",
    likelyCauses: [
      "The payer address is blocked by the facilitator's risk policy.",
      "The application is using a wallet that cannot transact with this facilitator or merchant.",
    ],
    nextSteps: [
      "Use a different payer wallet that satisfies the facilitator policy.",
      "Surface the compliance/policy rejection to the user or agent budget layer instead of retrying blindly.",
    ],
    references: [refs.verify, refs.troubleshooting],
  }),
  entry({
    code: "invalid_exact_evm_payload_authorization_to_address_kyt",
    title: "EVM recipient address blocked by KYT",
    layer: "provider",
    category: "compliance",
    summary: "The facilitator rejected the recipient/payTo address due to Know Your Transaction or policy screening.",
    likelyCauses: [
      "The merchant payTo address is blocked by the facilitator's risk policy.",
      "The PaymentRequirements object points at an unexpected recipient.",
    ],
    nextSteps: [
      "Confirm payTo came from the trusted resource server and has not been rewritten.",
      "Ask the resource server to provide a compliant payTo address or use another facilitator.",
    ],
    references: [refs.verify, refs.troubleshooting],
  }),
  entry({
    code: "invalid_exact_evm_payload_signature",
    title: "EVM payment signature invalid",
    layer: "wallet",
    category: "signature",
    summary: "The facilitator could not verify the EIP-712 signature on the EVM payment authorization.",
    likelyCauses: [
      "The signature was produced by the wrong wallet.",
      "The signed chain ID, asset, recipient, amount, nonce, or validity window differs from the payload.",
    ],
    nextSteps: [
      "Recompute the typed-data hash and recover the signer address locally.",
      "Sign a fresh payload from the payer that will fund the payment.",
    ],
    references: [refs.verify, refs.troubleshooting, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_payload_signature_address",
    title: "EVM signature recovered wrong address",
    layer: "wallet",
    category: "signature",
    summary: "The EVM signature is validly shaped but recovers an address that does not match authorization.from.",
    likelyCauses: [
      "The wallet used to sign is not the payer address in the authorization.",
      "The payload was assembled with a stale or incorrect from address.",
    ],
    nextSteps: [
      "Set authorization.from to the wallet that signs the typed data.",
      "Ensure the same signer owns the token balance used for payment.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_allowance_required",
    title: "Permit2 allowance required",
    category: "exact_evm_permit2",
    summary: "The Permit2 x402 path needs an ERC-20 allowance before the facilitator can settle the payment.",
    likelyCauses: [
      "The token does not support EIP-3009 and the fallback path uses Permit2.",
      "The payer has not approved the Permit2 contract or proxy for the required token amount.",
    ],
    nextSteps: [
      "Ask the payer to approve Permit2 for the asset and sufficient amount.",
      "Prefer EIP-3009-compatible assets such as supported USDC deployments when available.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "sometimes",
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_signature",
    title: "Permit2 signature invalid",
    layer: "wallet",
    category: "exact_evm_permit2",
    summary: "The Permit2 payment authorization signature could not be verified.",
    likelyCauses: [
      "The signature was produced by the wrong owner or for the wrong Permit2 domain.",
      "The amount, spender, token, nonce, chain ID, or deadline changed after signing.",
    ],
    nextSteps: [
      "Regenerate the Permit2 payload from the current payment requirement.",
      "Verify the domain, chain ID, token, owner, spender, recipient, amount, and deadline before retrying.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_deadline",
    title: "Permit2 deadline expired",
    category: "exact_evm_permit2",
    summary: "The Permit2 authorization deadline is no longer valid.",
    likelyCauses: [
      "The client retried after the signed permit expired.",
      "The signer or server clock is skewed.",
    ],
    nextSteps: [
      "Generate a fresh Permit2 signature with a valid deadline.",
      "Avoid caching PAYMENT-SIGNATURE values beyond their validity window.",
    ],
    retryHelpful: "yes",
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_valid_after",
    title: "Permit2 payload not valid yet",
    category: "exact_evm_permit2",
    summary: "The Permit2-style payload has a valid-after constraint that has not started yet.",
    likelyCauses: [
      "Client/server clock skew.",
      "The payment payload was intentionally created for future use but sent immediately.",
    ],
    nextSteps: [
      "Regenerate the payload with a current validity window.",
      "Synchronize the signer host clock.",
    ],
    retryHelpful: "sometimes",
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_spender",
    title: "Permit2 spender mismatch",
    category: "exact_evm_permit2",
    summary: "The Permit2 payload authorizes a spender that does not match the expected facilitator/proxy spender.",
    likelyCauses: [
      "The client signed a payload for a different facilitator, chain, or contract deployment.",
      "The payment requirement/proxy address was rewritten after signing.",
    ],
    nextSteps: [
      "Use the spender expected by the selected x402 Permit2 implementation.",
      "Regenerate the payload after selecting the final facilitator and network.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_recipient",
    title: "Permit2 recipient mismatch",
    category: "exact_evm_permit2",
    summary: "The Permit2 payment payload sends funds to a recipient different from PaymentRequirements.payTo.",
    likelyCauses: [
      "The client signed for a stale merchant address.",
      "The resource server's payment requirements changed between discovery and retry.",
    ],
    nextSteps: [
      "Compare the Permit2 recipient with payTo exactly.",
      "Fetch fresh requirements and sign a new payload if the recipient changed.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_evm_permit2_payload_amount",
    title: "Permit2 amount mismatch",
    category: "exact_evm_permit2",
    summary: "The Permit2 payment payload amount does not satisfy the required x402 amount.",
    likelyCauses: [
      "Wrong token decimals or stale price.",
      "The payload permits less than the amount the server requires.",
    ],
    nextSteps: [
      "Compare the Permit2 amount with accepted.amount in atomic units.",
      "Regenerate the payload from the current PaymentRequired object.",
    ],
    references: [refs.verify, refs.evm],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction",
    title: "SVM transaction invalid",
    category: "exact_svm",
    summary: "The Solana/SVM exact payment transaction is malformed or does not meet the x402 verifier rules.",
    likelyCauses: [
      "The transaction cannot be parsed, signed, or mapped to the expected SPL token transfer.",
      "The payload was built for a different resource, asset, or network.",
    ],
    nextSteps: [
      "Rebuild the SVM transaction from the selected PaymentRequirements.",
      "Check token program, source ATA, destination ATA, authority, amount, and compute-budget instructions.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_amount_mismatch",
    title: "SVM transaction amount mismatch",
    category: "exact_svm",
    summary: "The SVM transfer amount does not exactly match the x402 payment requirement amount.",
    likelyCauses: [
      "The transfer was built with stale pricing.",
      "The client used human units instead of atomic token units.",
    ],
    nextSteps: [
      "Compare the TransferChecked amount to accepted.amount.",
      "Regenerate the transaction from fresh payment requirements.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_create_ata_instruction",
    title: "SVM create ATA instruction invalid",
    category: "exact_svm",
    summary: "The SVM transaction's associated-token-account creation instruction is malformed or unexpected.",
    likelyCauses: [
      "The receiver ATA creation instruction does not match the expected token program layout.",
      "The transaction includes extra or reordered instructions the verifier rejects.",
    ],
    nextSteps: [
      "Use the reference SVM exact-scheme builder where possible.",
      "Ensure ATA creation, compute budget, and transfer instructions follow the expected order and accounts.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_create_ata_instruction_incorrect_payee",
    title: "SVM create ATA payee mismatch",
    category: "exact_svm",
    summary: "The transaction creates or targets an ATA for a payee different from PaymentRequirements.payTo.",
    likelyCauses: [
      "The payment payload was built for a different merchant/payee.",
      "The destination ATA was derived from the wrong wallet address.",
    ],
    nextSteps: [
      "Derive the receiver ATA from payTo and the asset mint.",
      "Regenerate the transaction from the exact PaymentRequirements object.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_create_ata_instruction_incorrect_asset",
    title: "SVM create ATA asset mismatch",
    category: "exact_svm",
    summary: "The transaction creates or targets an ATA for a token mint different from PaymentRequirements.asset.",
    likelyCauses: [
      "The payment transaction uses the wrong SPL token mint.",
      "The asset changed between discovery and retry.",
    ],
    nextSteps: [
      "Derive the ATA using the asset mint from PaymentRequirements.",
      "Regenerate the transaction if the resource advertised different assets.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instructions",
    title: "SVM transaction instructions invalid",
    category: "exact_svm",
    summary: "The SVM transaction instruction set does not match the verifier's expected x402 exact-payment layout.",
    likelyCauses: [
      "Required compute-budget, ATA, or transfer instructions are missing or malformed.",
      "The transaction contains extra instructions that could change payment semantics.",
    ],
    nextSteps: [
      "Inspect the full instruction list in order.",
      "Rebuild with the official x402 SVM exact scheme implementation.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instructions_length",
    title: "SVM transaction instruction count invalid",
    category: "exact_svm",
    summary: "The SVM transaction has too few, too many, or incorrectly ordered instructions for the exact scheme.",
    likelyCauses: [
      "An instruction was omitted or an extra custom instruction was appended.",
      "A wallet or middleware rewrote the transaction before submission.",
    ],
    nextSteps: [
      "Compare instruction count and order with the exact SVM scheme requirement.",
      "Build the payment transaction immediately before retrying the request.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instructions_compute_limit_instruction",
    title: "SVM compute limit instruction invalid",
    category: "exact_svm",
    summary: "The SVM transaction's compute-unit limit instruction is missing or malformed.",
    likelyCauses: [
      "The client omitted the expected compute budget instruction.",
      "The instruction uses an unsupported compute budget program layout.",
    ],
    nextSteps: [
      "Regenerate the transaction with the expected compute-unit limit instruction.",
      "Use the current x402 SVM client implementation for the target network.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instructions_compute_price_instruction",
    title: "SVM compute price instruction invalid",
    category: "exact_svm",
    summary: "The SVM transaction's compute-unit price instruction is missing or malformed.",
    likelyCauses: [
      "The transaction builder omitted the compute price instruction.",
      "A wallet adapter rewrote the compute budget instructions.",
    ],
    nextSteps: [
      "Regenerate with the expected compute-unit price instruction.",
      "Inspect the serialized transaction after all wallet/middleware hooks run.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instructions_compute_price_instruction_too_high",
    title: "SVM compute price too high",
    category: "exact_svm",
    summary: "The SVM transaction asks the facilitator to pay a compute-unit price above the verifier's allowed bound.",
    likelyCauses: [
      "The client generated a transaction with an excessive priority fee.",
      "A wallet or relay inflated the compute-unit price.",
    ],
    nextSteps: [
      "Lower the compute-unit price to the facilitator's accepted range.",
      "Regenerate the payment transaction from the supported client library.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instruction_not_spl_token_transfer_checked",
    title: "SVM instruction is not SPL Token TransferChecked",
    category: "exact_svm",
    summary: "The SVM transaction does not contain the expected SPL Token TransferChecked payment instruction.",
    likelyCauses: [
      "The transaction uses a different token transfer instruction.",
      "The asset/token program does not match the selected exact SVM payment method.",
    ],
    nextSteps: [
      "Use TransferChecked for SPL Token payments.",
      "Confirm the token program and mint match the PaymentRequirements asset.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_instruction_not_token_2022_transfer_checked",
    title: "SVM instruction is not Token-2022 TransferChecked",
    category: "exact_svm",
    summary: "The SVM transaction does not contain the expected Token-2022 TransferChecked payment instruction.",
    likelyCauses: [
      "The asset is a Token-2022 mint but the transaction used the legacy SPL Token program, or vice versa.",
      "The transfer instruction does not satisfy the verifier's exact-scheme layout.",
    ],
    nextSteps: [
      "Build the transfer using the token program required by the asset mint.",
      "Regenerate the transaction from the selected PaymentRequirements.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_not_a_transfer_instruction",
    title: "SVM instruction is not a token transfer",
    category: "exact_svm",
    summary: "The verifier could not identify the required token transfer instruction in the SVM payment transaction.",
    likelyCauses: [
      "The payload contains the wrong transaction.",
      "The transfer instruction was omitted or replaced by another program call.",
    ],
    nextSteps: [
      "Inspect the serialized transaction and locate the payment transfer instruction.",
      "Rebuild the payment transaction using the x402 SVM exact scheme builder.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_cannot_derive_receiver_ata",
    title: "SVM receiver ATA derivation failed",
    category: "exact_svm",
    summary: "The verifier could not derive the expected receiver associated token account from payTo and asset.",
    likelyCauses: [
      "The payTo value or asset mint is malformed.",
      "The selected token program does not match the asset.",
    ],
    nextSteps: [
      "Validate payTo and asset as SVM addresses/mints.",
      "Derive the receiver ATA locally and compare it with the transaction accounts.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_receiver_ata_not_found",
    title: "SVM receiver ATA not found",
    category: "exact_svm",
    summary: "The receiver associated token account required for the SVM payment could not be found.",
    likelyCauses: [
      "The transaction omitted ATA creation for a receiver that does not yet have one.",
      "The destination ATA was derived for the wrong mint or payee.",
    ],
    nextSteps: [
      "Include the expected create-ATA instruction when the receiver ATA does not exist.",
      "Verify the receiver ATA is derived from payTo and asset.",
    ],
    retryHelpful: "yes",
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_sender_ata_not_found",
    title: "SVM sender ATA not found",
    layer: "wallet",
    category: "exact_svm",
    summary: "The payer's source associated token account for the required asset does not exist.",
    likelyCauses: [
      "The payer has no token account for the asset mint.",
      "The client selected the wrong payer or token mint.",
    ],
    nextSteps: [
      "Create/fund the payer's ATA for the asset.",
      "Confirm the payer address in the payload owns the source ATA.",
    ],
    retryHelpful: "yes",
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_simulation_failed",
    title: "SVM transaction simulation failed",
    category: "exact_svm",
    summary: "The facilitator simulated the SVM payment transaction and the simulated transaction failed.",
    likelyCauses: [
      "Insufficient token balance or missing token accounts.",
      "The transaction fails token program, compute budget, or account ownership checks.",
    ],
    nextSteps: [
      "Run local simulation and inspect logs for the failing instruction.",
      "Check payer balance, source ATA, receiver ATA, token program, and compute budget.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
    references: [refs.verify, refs.troubleshooting],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_transfer_to_incorrect_ata",
    title: "SVM transfer targets wrong ATA",
    category: "exact_svm",
    summary: "The transfer instruction sends funds to an ATA different from the verifier's expected receiver ATA.",
    likelyCauses: [
      "The destination ATA was derived from the wrong payee or asset.",
      "The payment payload was built for a stale PaymentRequirements object.",
    ],
    nextSteps: [
      "Derive the expected ATA from payTo and asset and compare against the transfer destination.",
      "Regenerate the transaction from fresh payment requirements.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_fee_payer_included_in_instruction_accounts",
    title: "SVM facilitator fee payer appears in instruction accounts",
    category: "exact_svm",
    summary:
      "The SVM exact-scheme verifier rejects transactions where the facilitator fee payer appears in instruction accounts.",
    likelyCauses: [
      "The transaction lets the facilitator fee payer influence or receive funds beyond paying fees.",
      "A wallet/relay inserted the fee payer into payment instruction accounts.",
    ],
    nextSteps: [
      "Ensure the facilitator fee payer only pays network fees and is not part of payment movement accounts.",
      "Rebuild the transaction with the expected authority/source/destination accounts.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "invalid_exact_svm_payload_transaction_fee_payer_transferring_funds",
    title: "SVM facilitator fee payer is transferring funds",
    category: "exact_svm",
    summary: "The SVM exact-scheme verifier rejected a transaction where the facilitator fee payer transfers funds.",
    likelyCauses: [
      "The transaction uses the facilitator fee payer as source, authority, or transfer participant.",
      "The client built the transaction with the wrong payer/authority account.",
    ],
    nextSteps: [
      "Use the actual client payer as token source/authority.",
      "Keep the facilitator fee payer limited to transaction fee payment only.",
    ],
    references: [refs.verify, refs.spec],
  }),
  entry({
    code: "settle_exact_evm_transaction_confirmation_timed_out",
    title: "EVM settlement confirmation timed out",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The facilitator submitted or tracked the EVM settlement transaction but did not observe confirmation in time.",
    likelyCauses: [
      "The chain or RPC backend is congested or slow.",
      "The settlement transaction was underpriced or the node failed to return the receipt before timeout.",
    ],
    nextSteps: [
      "Check the transaction hash on the target chain if one was returned.",
      "Retry only after confirming whether the previous settlement succeeded to avoid duplicate work.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
    references: [refs.settle],
  }),
  entry({
    code: "settle_exact_node_failure",
    title: "Settlement node failure",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The facilitator could not complete settlement because the blockchain node/RPC backend failed.",
    likelyCauses: [
      "RPC endpoint is unavailable, rate-limited, or returning inconsistent state.",
      "The facilitator's upstream node failed during transaction submission or receipt polling.",
    ],
    nextSteps: [
      "Retry with backoff or use another facilitator/node backend.",
      "Check whether a transaction hash exists before resubmitting settlement.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "no",
    references: [refs.settle, refs.troubleshooting],
  }),
  entry({
    code: "settle_exact_failed_onchain",
    title: "Settlement failed on-chain",
    layer: "evm",
    category: "facilitator_settle",
    summary: "The facilitator settlement transaction was submitted but reverted or failed on-chain.",
    likelyCauses: [
      "The token transfer authorization was consumed, expired, underfunded, or no longer valid at execution.",
      "The asset contract, Permit2 path, or token program rejected the settlement transaction.",
    ],
    nextSteps: [
      "Decode the on-chain transaction failure/revert if a hash is available.",
      "Fetch fresh payment requirements and sign a new payment only after confirming the old one did not settle.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
    references: [refs.settle],
  }),
  entry({
    code: "settle_exact_svm_block_height_exceeded",
    title: "SVM settlement block height exceeded",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The SVM settlement transaction expired before confirmation because its recent blockhash/block height window elapsed.",
    likelyCauses: [
      "The transaction was not submitted or confirmed before its validity window expired.",
      "Network congestion or RPC delays prevented timely confirmation.",
    ],
    nextSteps: [
      "Regenerate the SVM transaction with a fresh blockhash.",
      "Retry settlement after checking that the previous transaction did not land.",
    ],
    retryHelpful: "yes",
    increasingGasHelpful: "sometimes",
    references: [refs.settle],
  }),
  entry({
    code: "settle_exact_svm_transaction_confirmation_timed_out",
    title: "SVM settlement confirmation timed out",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The facilitator did not observe confirmation for the SVM settlement transaction before timeout.",
    likelyCauses: [
      "RPC confirmation polling lagged or failed.",
      "The transaction landed slowly, expired, or failed during execution.",
    ],
    nextSteps: [
      "Look up the returned Solana signature if present.",
      "Retry with a fresh transaction only after checking prior settlement status.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "sometimes",
    references: [refs.settle],
  }),
  entry({
    code: "invalid_transaction_state",
    title: "Invalid transaction state",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The facilitator or verifier observed a transaction state that cannot be accepted as a valid payment.",
    likelyCauses: [
      "The settlement transaction failed, was replaced, expired, or is in an unexpected state.",
      "The chain response does not match the expected success/failure model for the selected scheme.",
    ],
    nextSteps: [
      "Inspect the transaction receipt/status on the target network.",
      "Do not retry automatically until duplicate-settlement risk is ruled out.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "unknown",
    references: [refs.spec, refs.settle],
  }),
  entry({
    code: "unexpected_verify_error",
    title: "Unexpected verification error",
    layer: "provider",
    category: "facilitator_verify",
    summary: "The facilitator hit an unexpected internal error while verifying the x402 payment payload.",
    rootCauseKnown: false,
    likelyCauses: [
      "A facilitator service bug or transient upstream failure.",
      "A payload edge case that is not mapped to a specific invalidReason yet.",
    ],
    nextSteps: [
      "Log the PaymentPayload, PaymentRequirements, facilitator endpoint, and request ID if present.",
      "Retry with backoff or test against another facilitator to isolate provider behavior.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "unknown",
    confidence: "medium",
    references: [refs.spec, refs.verify],
  }),
  entry({
    code: "unexpected_settle_error",
    title: "Unexpected settlement error",
    layer: "provider",
    category: "facilitator_settle",
    summary: "The facilitator hit an unexpected internal error while settling an x402 payment.",
    rootCauseKnown: false,
    likelyCauses: [
      "A facilitator service bug, RPC failure, or unclassified chain response.",
      "A settlement edge case that is not mapped to a specific errorReason yet.",
    ],
    nextSteps: [
      "Check whether a transaction hash was created before retrying.",
      "Capture the facilitator response/request ID and retry with backoff or another facilitator.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "unknown",
    confidence: "medium",
    references: [refs.spec, refs.settle],
  }),
  entry({
    code: "unknown_error",
    title: "Unknown x402 facilitator error",
    layer: "provider",
    category: "facilitator",
    summary: "The facilitator returned the generic x402 unknown_error reason.",
    rootCauseKnown: false,
    likelyCauses: [
      "The facilitator could not classify the verification or settlement failure.",
      "A newer x402 implementation returned an error this catalog has not split out yet.",
    ],
    nextSteps: [
      "Inspect adjacent invalidMessage/errorMessage fields and any request ID.",
      "Check the facilitator's current API reference and open a catalog update if a new reason is documented.",
    ],
    retryHelpful: "sometimes",
    increasingGasHelpful: "unknown",
    confidence: "medium",
    references: [refs.verify, refs.settle],
  }),
];

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`wrote ${entries.length} x402 entries to ${outPath}`);
