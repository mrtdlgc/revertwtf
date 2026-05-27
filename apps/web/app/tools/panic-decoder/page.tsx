import { PanicDecoder } from "@/components/PanicDecoder";
import { ToolShell } from "@/components/ToolShell";

export const metadata = { title: "panic decoder - revert.wtf" };

export default function Page() {
  return (
    <ToolShell
      kicker="/tools/panic-decoder"
      title="panic decoder"
      blurb="Solidity Panic(uint256) codes. Type one in or copy it from a Panic-shaped revert."
    >
      <PanicDecoder />
    </ToolShell>
  );
}
