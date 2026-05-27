import { AADecoder } from "@/components/AADecoder";
import { ToolShell } from "@/components/ToolShell";
import { listKnownAACodes } from "@revertwtf/aa/parse";

export const metadata = { title: "aa decoder - revert.wtf" };

export default function Page() {
  return (
    <ToolShell
      kicker="/tools/aa-error-decoder"
      title="aa error decoder"
      blurb="ERC-4337 and UserOperation failures. Paste a FailedOp payload, an AAxx reason string, or EntryPoint revert bytes."
    >
      <AADecoder knownCodes={listKnownAACodes()} />
    </ToolShell>
  );
}
