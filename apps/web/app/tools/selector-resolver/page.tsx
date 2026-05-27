import { SelectorResolver } from "@/components/SelectorResolver";
import { ToolShell } from "@/components/ToolShell";
import { BUILTIN_SELECTORS } from "@revertwtf/selectors/data";

export const metadata = { title: "selector resolver - revert.wtf" };

export default function Page() {
  return (
    <ToolShell
      kicker="/tools/selector-resolver"
      title="selector resolver"
      blurb="Map a 4-byte selector to a known signature from standards, libraries, protocols, and common error interfaces."
    >
      <SelectorResolver selectorCount={BUILTIN_SELECTORS.length} />
    </ToolShell>
  );
}
