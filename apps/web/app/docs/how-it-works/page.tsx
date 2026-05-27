import { DocShell } from "@/components/DocShell";

export const metadata = { title: "how explanations work - revert.wtf" };

export default function Page() {
  return (
    <DocShell kicker="/docs/how-it-works" title="how explanations work">
      <p className="brutal-card-flat p-4 bg-acid">
        <strong>EVM errors usually have more context than the first message shows.</strong>{" "}
        revert.wtf looks for that context and returns a plain explanation with
        likely causes and actions to take next.
      </p>

      <h2 className="font-display text-4xl mt-8">what it reads</h2>
      <p>
        Paste raw revert bytes, JSON-RPC errors, wallet/provider responses,
        ethers or viem exceptions, simulator traces, ERC-4337 failures, or x402
        payment/facilitator responses. The parser normalizes the shape before
        matching catalog entries.
      </p>

      <h2 className="font-display text-4xl mt-8">what it can explain</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>Solidity <code>Error(string)</code> and <code>Panic(uint256)</code> data.</li>
        <li>Known custom errors and 4-byte selectors from standards, libraries, and protocols.</li>
        <li>JSON-RPC codes, EIP-1193 wallet codes, and provider-specific wrappers.</li>
        <li>Failed simulator/debugger trace frames.</li>
        <li>ERC-4337 AAxx strings and EntryPoint <code>FailedOp</code> data.</li>
        <li>x402 payment-required, verification, settlement, EVM, Permit2, and SVM failures.</li>
      </ul>

      <h2 className="font-display text-4xl mt-8">when there is no match</h2>
      <p>
        Unknown results are still useful: they show the normalized evidence and
        point to the decoder or catalog contribution path so a protocol can add
        the missing explanation.
      </p>
    </DocShell>
  );
}
