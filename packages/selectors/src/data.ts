import type { Hex, SignatureCandidate } from "@revertwtf/core";
import { GENERATED_SELECTORS } from "./generated.js";

// Built-in selector table. Precomputed keccak256-prefix(signature)[0..4].
// Keep entries deterministic; no live network calls in this package.
//
// Verified entries are part of well-known standards (Solidity built-ins,
// EIP-6093, EIP-3668, ERC-4337 EntryPoint, OpenZeppelin v5 custom errors).

export interface RawEntry {
  selector: Hex;
  signature: string;
  name: string;
  source: string;
  confidence: SignatureCandidate["confidence"];
}

export const BUILTIN_SELECTORS: RawEntry[] = [
  // Solidity built-ins
  { selector: "0x08c379a0", signature: "Error(string)", name: "Error", source: "solidity", confidence: "verified" },
  { selector: "0x4e487b71", signature: "Panic(uint256)", name: "Panic", source: "solidity", confidence: "verified" },

  // EIP-3668 (CCIP Read)
  { selector: "0x556f1830", signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)", name: "OffchainLookup", source: "eip-3668", confidence: "verified" },

  // ERC-4337 EntryPoint
  { selector: "0x220266b6", signature: "FailedOp(uint256,string)", name: "FailedOp", source: "erc-4337", confidence: "verified" },
  { selector: "0x65c8fd4d", signature: "FailedOpWithRevert(uint256,string,bytes)", name: "FailedOpWithRevert", source: "erc-4337", confidence: "verified" },
  { selector: "0x9e9a8d31", signature: "SignatureValidationFailed(address)", name: "SignatureValidationFailed", source: "erc-4337", confidence: "verified" },
  { selector: "0xe0cff05f", signature: "ValidationResult((uint256,uint256,bool,uint48,uint48,bytes),(uint256,uint256),(uint256,uint256),(uint256,uint256))", name: "ValidationResult", source: "erc-4337", confidence: "known" },

  // EIP-6093 ERC-20 custom errors
  { selector: "0xe450d38c", signature: "ERC20InsufficientBalance(address,uint256,uint256)", name: "ERC20InsufficientBalance", source: "eip-6093", confidence: "verified" },
  { selector: "0xfb8f41b2", signature: "ERC20InsufficientAllowance(address,uint256,uint256)", name: "ERC20InsufficientAllowance", source: "eip-6093", confidence: "verified" },
  { selector: "0x96c6fd1e", signature: "ERC20InvalidSender(address)", name: "ERC20InvalidSender", source: "eip-6093", confidence: "verified" },
  { selector: "0xec442f05", signature: "ERC20InvalidReceiver(address)", name: "ERC20InvalidReceiver", source: "eip-6093", confidence: "verified" },
  { selector: "0xe602df05", signature: "ERC20InvalidApprover(address)", name: "ERC20InvalidApprover", source: "eip-6093", confidence: "verified" },
  { selector: "0x94280d62", signature: "ERC20InvalidSpender(address)", name: "ERC20InvalidSpender", source: "eip-6093", confidence: "verified" },

  // EIP-6093 ERC-721 custom errors
  { selector: "0x7e273289", signature: "ERC721NonexistentToken(uint256)", name: "ERC721NonexistentToken", source: "eip-6093", confidence: "verified" },
  { selector: "0x177e802f", signature: "ERC721IncorrectOwner(address,uint256,address)", name: "ERC721IncorrectOwner", source: "eip-6093", confidence: "verified" },
  { selector: "0x64283d7b", signature: "ERC721InsufficientApproval(address,uint256)", name: "ERC721InsufficientApproval", source: "eip-6093", confidence: "verified" },

  // OpenZeppelin v5 access control
  { selector: "0x118cdaa7", signature: "OwnableUnauthorizedAccount(address)", name: "OwnableUnauthorizedAccount", source: "openzeppelin", confidence: "verified" },
  { selector: "0x1e4fbdf7", signature: "OwnableInvalidOwner(address)", name: "OwnableInvalidOwner", source: "openzeppelin", confidence: "verified" },
  { selector: "0xe2517d3f", signature: "AccessControlUnauthorizedAccount(address,bytes32)", name: "AccessControlUnauthorizedAccount", source: "openzeppelin", confidence: "verified" },
  { selector: "0xd93c0665", signature: "EnforcedPause()", name: "EnforcedPause", source: "openzeppelin", confidence: "verified" },
  { selector: "0x8dfc202b", signature: "ExpectedPause()", name: "ExpectedPause", source: "openzeppelin", confidence: "verified" },
  { selector: "0x3ee5aeb5", signature: "ReentrancyGuardReentrantCall()", name: "ReentrancyGuardReentrantCall", source: "openzeppelin", confidence: "verified" },

  ...GENERATED_SELECTORS,
];

const BY_SELECTOR = new Map<string, RawEntry[]>();
for (const e of BUILTIN_SELECTORS) {
  const key = e.selector.toLowerCase();
  const list = BY_SELECTOR.get(key) ?? [];
  list.push(e);
  BY_SELECTOR.set(key, list);
}

export function selectorIndex(): Map<string, RawEntry[]> {
  return BY_SELECTOR;
}
