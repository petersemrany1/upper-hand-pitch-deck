import { useEffect, useRef } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Supabase realtime subscriptions.
 *
 * Components used to open their own channels (13 files, duplicated and
 * leak-prone). This hook multiplexes: identical (table, event, filter)
 * specs share ONE channel; the channel is opened on first subscriber and
 * torn down when the last unsubscribes.
 */

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimeSpec = {
  table: string;
  /** Defaults to "*" (all change types). */
  event?: RealtimeEvent;
  schema?: string;
  /** Postgres changes filter, e.g. `rep_id=eq.${repId}` */
  filter?: string;
};

export type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

type Listener = (payload: RealtimePayload) => void;

type Entry = {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
};

const registry = new Map<string, Entry>();

function specKey(spec: RealtimeSpec): string {
  return [spec.schema ?? "public", spec.table, spec.event ?? "*", spec.filter ?? ""].join("|");
}

/**
 * Imperative variant for non-hook contexts (event handlers, dynamic
 * lifecycles). Returns an unsubscribe function. Shares the same channel
 * registry as the hook.
 */
export function subscribeRealtime(spec: RealtimeSpec, listener: Listener): () => void {
  const key = specKey(spec);
  let entry = registry.get(key);
  if (!entry) {
    const listeners = new Set<Listener>();
    const channel = supabase
      .channel(`shared:${key}`)
      .on(
        "postgres_changes",
        {
          event: spec.event ?? "*",
          schema: spec.schema ?? "public",
          table: spec.table,
          ...(spec.filter ? { filter: spec.filter } : {}),
        },
        (payload: RealtimePayload) => {
          for (const l of listeners) l(payload);
        }
      )
      .subscribe();
    entry = { channel, listeners };
    registry.set(key, entry);
  }
  entry.listeners.add(listener);

  return () => {
    const current = registry.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      registry.delete(key);
      void supabase.removeChannel(current.channel);
    }
  };
}

/**
 * Subscribe to Postgres changes. `onChange` is kept in a ref so callers can
 * pass inline closures without re-subscribing every render.
 */
export function useRealtimeSubscription(
  spec: RealtimeSpec,
  onChange: (payload: RealtimePayload) => void,
  enabled = true
): void {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  const key = specKey(spec);

  useEffect(() => {
    if (!enabled) return;
    const [schema, table, event, filter] = key.split("|");
    return subscribeRealtime(
      { schema, table, event: event as RealtimeEvent, filter: filter || undefined },
      (payload) => handlerRef.current(payload)
    );
  }, [key, enabled]);
}
