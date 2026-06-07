import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useUserStore from '../stores/useUserStore';
import useLeadStore from '../stores/useLeadStore';
import useDealStore from '../stores/useDealStore';
import useTaskStore from '../stores/useTaskStore';
import useUIStore from '../stores/useUIStore';

/**
 * Tracks timestamps of recent local mutations to suppress realtime echo.
 *
 * When we make an optimistic update, the server round-trip will fire a
 * realtime event back to us with the same data. We skip applying that echo
 * to avoid overwriting the already-correct optimistic state with a (possibly
 * stale) server response.
 *
 * Entries expire after ECHO_WINDOW_MS to avoid memory leaks.
 */
const ECHO_WINDOW_MS = 3000;
const recentMutations = new Map(); // key: `${table}:${id}` → timestamp

/**
 * Mark an item as recently mutated by the current client.
 * Called internally when we detect that a realtime event matches an item
 * that was just changed optimistically.
 */
export function markLocalMutation(table, id) {
  recentMutations.set(`${table}:${id}`, Date.now());
}

function isEcho(table, id) {
  const key = `${table}:${id}`;
  const ts = recentMutations.get(key);
  if (!ts) return false;
  if (Date.now() - ts > ECHO_WINDOW_MS) {
    recentMutations.delete(key);
    return false;
  }
  return true;
}

// Periodically clean up stale entries (every 30s)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of recentMutations) {
      if (now - ts > ECHO_WINDOW_MS * 2) recentMutations.delete(key);
    }
  }, 30_000);
}

// ── Helpers to merge realtime payloads directly into Zustand stores ──

function applyLeadChange(eventType, payload) {
  const store = useLeadStore;

  if (eventType === 'DELETE') {
    const oldId = payload.old?.id;
    if (!oldId) return;
    store.setState((state) => ({
      leads: state.leads.filter((l) => l.id !== oldId),
    }));
    return;
  }

  const record = payload.new;
  if (!record || !record.id) {
    // Incomplete payload — fall back to full refetch
    store.getState().fetchData();
    return;
  }

  if (isEcho('leads', record.id)) return;

  if (eventType === 'INSERT') {
    // Only add if we don't already have it (prevents dupes from optimistic add)
    store.setState((state) => {
      const exists = state.leads.some((l) => l.id === record.id);
      if (exists) return state;
      return { leads: [record, ...state.leads] };
    });
  } else if (eventType === 'UPDATE') {
    store.setState((state) => {
      const idx = state.leads.findIndex((l) => l.id === record.id);
      if (idx === -1) {
        // Item not in store — append it
        return { leads: [record, ...state.leads] };
      }
      const updated = [...state.leads];
      updated[idx] = { ...updated[idx], ...record };
      return { leads: updated };
    });
  }
}

function applyDealChange(eventType, payload) {
  const store = useDealStore;

  if (eventType === 'DELETE') {
    const oldId = payload.old?.id;
    if (!oldId) return;
    store.setState((state) => ({
      deals: state.deals.filter((d) => d.id !== oldId),
    }));
    return;
  }

  const record = payload.new;
  if (!record || !record.id) {
    store.getState().fetchDeals();
    return;
  }

  if (isEcho('deals', record.id)) return;

  if (eventType === 'INSERT') {
    store.setState((state) => {
      const exists = state.deals.some((d) => d.id === record.id);
      if (exists) return state;
      return { deals: [record, ...state.deals] };
    });
  } else if (eventType === 'UPDATE') {
    store.setState((state) => {
      const idx = state.deals.findIndex((d) => d.id === record.id);
      if (idx === -1) {
        return { deals: [record, ...state.deals] };
      }
      const updated = [...state.deals];
      updated[idx] = { ...updated[idx], ...record };
      return { deals: updated };
    });
  }
}

function applyProfileChange(eventType, payload) {
  const store = useUserStore;

  if (eventType === 'DELETE') return; // profiles should not be deleted

  const record = payload.new;
  if (!record || !record.id) return;

  store.setState((state) => {
    // Update in the users list
    const users = state.users.map((u) =>
      u.id === record.id ? { ...u, ...record } : u,
    );
    // Also update currentUserProfile if it matches
    const currentUserProfile =
      state.currentUserProfile?.id === record.id
        ? { ...state.currentUserProfile, ...record }
        : state.currentUserProfile;
    return { users, currentUserProfile };
  });
}

function applyMonthlyTargetChange(eventType, payload) {
  const store = useUserStore;

  if (eventType === 'DELETE') {
    const oldId = payload.old?.id;
    if (!oldId) return;
    store.setState((state) => ({
      monthlyTargets: state.monthlyTargets.filter((t) => t.id !== oldId),
    }));
    return;
  }

  const record = payload.new;
  if (!record || !record.id) return;

  store.setState((state) => {
    const idx = state.monthlyTargets.findIndex((t) => t.id === record.id);
    if (idx === -1) {
      return { monthlyTargets: [...state.monthlyTargets, record] };
    }
    const updated = [...state.monthlyTargets];
    updated[idx] = { ...updated[idx], ...record };
    return { monthlyTargets: updated };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global hook to manage Supabase Realtime subscriptions.
 * Mount this once in the root App component.
 *
 * Instead of refetching entire tables on every change, this hook applies
 * incoming realtime payloads directly into the Zustand stores (leads, deals,
 * profiles, monthly_targets). A full refetch only happens when the realtime
 * payload is incomplete.
 */
export default function useRealtime() {
  const { session, currentUserProfile } = useUserStore();
  const { setLastSynced } = useUIStore();

  useEffect(() => {
    // Only subscribe if we are authenticated
    if (!session || !currentUserProfile) return;

    const userId = currentUserProfile.id;
    const isManager = currentUserProfile.role === 'manager';

    // Build filter based on role (managers see all, sales sees own)
    const filterString = isManager ? undefined : `assigned_to=eq.${userId}`;

    // Create a single channel for all table updates to reduce connection overhead
    const channel = supabase.channel('command-os-db-changes');

    channel
      // ── Leads ──
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: filterString },
        (payload) => {
          console.log('Realtime lead:', payload.eventType);
          setLastSynced(new Date());
          applyLeadChange(payload.eventType, payload);

          // Lead changes can affect task priorities
          useTaskStore.getState().fetchPriorityQueue();
        },
      )
      // ── Tasks ──
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: filterString },
        (payload) => {
          console.log('Realtime task:', payload.eventType);
          useTaskStore.getState().fetchPriorityQueue();
          useTaskStore.getState().fetchAllTasks();
        },
      )
      // ── Deals ──
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: filterString },
        (payload) => {
          console.log('Realtime deal:', payload.eventType);
          setLastSynced(new Date());
          applyDealChange(payload.eventType, payload);

          // Deal changes can affect lead scores and task priorities
          useTaskStore.getState().fetchPriorityQueue();
        },
      )
      // ── Profiles (no filter — everyone should see profile updates) ──
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime profile:', payload.eventType);
          applyProfileChange(payload.eventType, payload);
        },
      )
      // ── Monthly targets (no filter — shared across team) ──
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_targets' },
        (payload) => {
          console.log('Realtime monthly_target:', payload.eventType);
          applyMonthlyTargetChange(payload.eventType, payload);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime execution engine active');
        }
      });

    // Cleanup subscription on unmount or session change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, currentUserProfile, setLastSynced]);
}
