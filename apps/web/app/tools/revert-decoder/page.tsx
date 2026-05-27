import { RevertDecoder } from "@/components/RevertDecoder";
import { ToolShell } from "@/components/ToolShell";

export const metadata = { title: "revert decoder - revert.wtf" };

export default function Page() {
  return (
    <ToolShell
      kicker="/tools/revert-decoder"
      title="revert decoder"
      blurb="Drop raw revert bytes. Decodes Error(string), Panic(uint256), known custom errors, and arbitrary custom errors if you paste an ABI."
    >
      <RevertDecoder />
    </ToolShell>
  );
}
