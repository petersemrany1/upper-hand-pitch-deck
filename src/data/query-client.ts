import { QueryClient } from "@tanstack/react-query";

/**
 * App-wide QueryClient. Created once per browser session (and per SSR
 * request via getQueryClient).
 *
 * Defaults tuned for a realtime-ish CRM: data is considered fresh for 30s
 * (realtime subscriptions invalidate sooner when rows change), one retry,
 * no refetch storms on window focus.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
