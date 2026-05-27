import { ErrorPasteBox } from "@/components/ErrorPasteBox";
import { ToolShell } from "@/components/ToolShell";

export const metadata = { title: "rpc error parser - revert.wtf" };

export default function Page() {
  return (
    <ToolShell
      kicker="/tools/rpc-error-parser"
      title="rpc error parser"
      blurb="Paste JSON-RPC, ethers, viem, wallet, provider, or simulator payloads. The parser normalizes the shape and ranks catalog matches."
    >
      <ErrorPasteBox />
    </ToolShell>
  );
}
