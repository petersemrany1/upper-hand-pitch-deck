// Ported from the Legal app (family-law-floater/src/components/sales-call/client-finder.tsx). Re-run the port script to refresh.
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, MessageSquare, Search, X } from "lucide-react";
import { supabase } from "@/legal/integrations/supabase/client";
import { clientSearchFilters } from "@/legal/lib/client-search";
import { Button } from "@/legal/components/ui/button";
import { Input } from "@/legal/components/ui/input";

export type FoundClient = { leadId: string; name: string; phone: string | null };
type FinderActions =
  | {
      renderAction: (client: FoundClient) => ReactNode;
    }
  | {
      onThread: (client: FoundClient) => void;
      onOpenSalesCall: (id: string) => void;
    };
export function ClientFinder({
  children,
  initialSearch = "",
  ...actions
}: FinderActions & { children?: ReactNode; initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [settled, setSettled] = useState(initialSearch);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const filters = clientSearchFilters(settled);
  const results = useQuery({
    queryKey: ["inbox-client-search", settled],
    enabled: filters.length > 0,
    queryFn: async () => {
      // The signed-in client's RLS applies: never bypass permissions for search.
      let query = supabase
        .from("client_leads")
        .select("id, first_name, last_name, phone, email, status, created_at");
      for (const filter of filters) query = query.or(filter);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(31);
      if (error) throw error;
      return data ?? [];
    },
  });
  const searching = search.trim().length > 0;
  const waiting = settled !== search.trim() || (filters.length > 0 && results.isPending);
  return (
    <>
      <div className="space-y-2 border-b bg-card p-4">
        <label htmlFor="inbox-client-search" className="text-sm font-semibold">
          Find a client
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="inbox-client-search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone or email"
            className="pl-9 pr-9"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear client search"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 rounded p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {"onThread" in actions && (
          <p className="text-xs text-muted-foreground">
            Search client records, even without a text conversation.
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {!searching ? (
          children
        ) : waiting ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching clients…
          </p>
        ) : !filters.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            Enter at least two letters or three phone digits.
          </p>
        ) : results.isError ? (
          <div className="space-y-2 p-4">
            <p className="text-sm">Couldn’t load clients.</p>
            <Button variant="outline" onClick={() => void results.refetch()}>
              Try again
            </Button>
          </div>
        ) : !results.data?.length ? (
          <div className="p-5">
            <p className="text-sm font-medium">No clients found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a surname, part of their number or their email.
            </p>
          </div>
        ) : (
          <>
            <p className="px-4 pb-1 pt-3 text-xs text-muted-foreground">
              {results.data.length > 30
                ? "Showing first 30 matches — narrow your search"
                : `${results.data.length} client${results.data.length === 1 ? "" : "s"} found`}
            </p>
            <ul className="divide-y">
              {results.data.slice(0, 30).map((client) => {
                const name =
                  [client.first_name, client.last_name].filter(Boolean).join(" ") ||
                  "Unnamed client";
                return (
                  <li key={client.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {client.phone || "No phone number"}
                        </p>
                        {client.email && (
                          <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] capitalize">
                        {client.status?.replaceAll("_", " ") || "New"}
                      </span>
                    </div>
                    {"renderAction" in actions ? (
                      actions.renderAction({ leadId: client.id, phone: client.phone, name })
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => actions.onOpenSalesCall(client.id)}
                        >
                          Open sales call <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            actions.onThread({ leadId: client.id, phone: client.phone, name })
                          }
                        >
                          <MessageSquare className="mr-2 h-3.5 w-3.5" /> Messages
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
