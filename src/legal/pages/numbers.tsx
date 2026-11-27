// Ported from the Legal app (family-law-floater/src/routes/_authenticated/numbers.tsx). Re-run the port script to refresh.
import { useRouteContext } from "@/legal/runtime/router";
import { NumbersDashboard } from "@/legal/components/numbers/NumbersDashboard";
// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { NumbersGate as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [{ title: "Numbers — Legal Group Portal" }, { name: "robots", content: "noindex" }],
  }),
  component: NumbersGate,
});
function NumbersGate() {
  const { role, user } = useRouteContext({ from: "/_authenticated" });
  return role.isAdmin ? (
    <NumbersDashboard userId={user.id} />
  ) : (
    <p className="p-8">Numbers is available to administrators.</p>
  );
}
