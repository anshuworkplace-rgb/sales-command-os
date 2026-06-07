/**
 * Optimistic Mutation Helpers for Zustand Stores
 *
 * These utilities wrap Zustand store mutations with an optimistic update
 * pattern: apply the change locally first, fire the remote call, and rollback
 * with a toast notification if the remote call fails.
 *
 * Usage inside a Zustand `create` callback:
 *
 *   updateLead: optimistic({
 *     key: 'leads',
 *     mutate: (leads, { id, updates }) =>
 *       leads.map(l => (l.id === id ? { ...l, ...updates } : l)),
 *     remote: ({ id, updates }) => leadService.updateLead(id, updates),
 *     rollbackMessage: 'Failed to update lead',
 *   }),
 *
 * The returned function has the signature:
 *   (set, get, args) => Promise<result>
 *
 * which aligns with Zustand's (set, get) convention — the store action that
 * calls this wrapper simply forwards set/get along with any action-specific
 * arguments.
 */

import useToastStore from '../stores/useToastStore';

// ─── Generic optimistic update ──────────────────────────────────────────────

/**
 * Creates an optimistic mutation wrapper for in-place updates.
 *
 * @param {Object}   opts
 * @param {string}   opts.key             — Zustand state key holding the array
 * @param {Function} opts.mutate          — (currentArray, args) => newArray
 * @param {Function} opts.remote          — (args) => Promise — the API call
 * @param {string}   [opts.rollbackMessage] — toast text shown on rollback
 * @param {string|Function} [opts.successMessage] — toast text on success
 * @returns {Function} (set, get, args) => Promise
 */
export function optimistic({ key, mutate, remote, rollbackMessage, successMessage }) {
  return async function (set, get, args) {
    // 1. Snapshot current state for rollback
    const snapshot = get()[key];

    // 2. Optimistically apply the mutation
    set({ [key]: mutate(snapshot, args) });

    try {
      // 3. Execute the remote operation
      const result = await remote(args);

      // 4. Optional success toast
      if (successMessage) {
        useToastStore.getState().success(
          typeof successMessage === 'function'
            ? successMessage(args, result)
            : successMessage,
        );
      }

      return result;
    } catch (error) {
      // 5. Rollback on failure
      set({ [key]: snapshot });

      // 6. Error toast
      useToastStore.getState().error(
        rollbackMessage
          ? `${rollbackMessage}: ${error.message}`
          : `Operation failed: ${error.message}`,
      );

      console.error('[Optimistic Rollback]', error);
      throw error;
    }
  };
}

// ─── Optimistic add (append with temp ID) ───────────────────────────────────

/**
 * Creates an optimistic mutation wrapper for adding items to an array.
 * Inserts a temporary item immediately, then replaces it with the real server
 * response once the remote call resolves.
 *
 * @param {Object}   opts
 * @param {string}   opts.key             — Zustand state key holding the array
 * @param {string}   [opts.tempId]        — explicit temp ID; defaults to `temp-<timestamp>`
 * @param {Function} opts.remote          — (newItem) => Promise<serverItem>
 * @param {string}   [opts.rollbackMessage]
 * @param {string|Function} [opts.successMessage]
 * @returns {Function} (set, get, newItem) => Promise<serverItem>
 */
export function optimisticAdd({ key, tempId, remote, rollbackMessage, successMessage }) {
  return async function (set, get, newItem) {
    const id = tempId || `temp-${Date.now()}`;
    const temp = { ...newItem, id, _optimistic: true };
    const snapshot = get()[key];

    // Prepend the temp item for instant UI feedback
    set({ [key]: [temp, ...snapshot] });

    try {
      const result = await remote(newItem);

      // Replace the temp item with the real server-created item
      set({ [key]: get()[key].map((item) => (item.id === id ? result : item)) });

      if (successMessage) {
        useToastStore.getState().success(
          typeof successMessage === 'function'
            ? successMessage(newItem, result)
            : successMessage,
        );
      }

      return result;
    } catch (error) {
      // Restore from snapshot
      set({ [key]: snapshot });

      useToastStore.getState().error(
        rollbackMessage
          ? `${rollbackMessage}: ${error.message}`
          : `Failed to create: ${error.message}`,
      );

      console.error('[Optimistic Add Rollback]', error);
      throw error;
    }
  };
}

// ─── Optimistic delete (with optional undo) ─────────────────────────────────

/**
 * Creates an optimistic mutation wrapper for deleting items.
 * Removes the item immediately; if `undoRemote` is provided, shows an undo
 * toast that restores the item both locally and on the server.
 *
 * @param {Object}   opts
 * @param {string}   opts.key             — Zustand state key holding the array
 * @param {Function} opts.remote          — (id) => Promise — the delete API call
 * @param {string}   [opts.rollbackMessage]
 * @param {Function} [opts.undoRemote]    — (deletedItem) => Promise — re-creates on server
 * @returns {Function} (set, get, id) => Promise<void>
 */
export function optimisticDelete({ key, remote, rollbackMessage, undoRemote }) {
  return async function (set, get, id) {
    const snapshot = get()[key];
    const deletedItem = snapshot.find((item) => item.id === id);

    // Remove immediately
    set({ [key]: snapshot.filter((item) => item.id !== id) });

    // Show undo toast for destructive actions when an undo handler exists
    if (undoRemote && deletedItem) {
      const toastStore = useToastStore.getState();
      toastStore.addToast('info', rollbackMessage || 'Item deleted', {
        title: 'Deleted',
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: async () => {
            // Restore locally first for instant feedback
            set((state) => ({ [key]: [deletedItem, ...state[key]] }));
            // Then restore on the server
            try {
              await undoRemote(deletedItem);
            } catch (e) {
              console.error('[Undo Failed]', e);
            }
          },
        },
      });
    }

    try {
      await remote(id);
    } catch (error) {
      // Rollback the deletion
      set({ [key]: snapshot });

      useToastStore.getState().error(`Delete failed: ${error.message}`);

      console.error('[Optimistic Delete Rollback]', error);
      throw error;
    }
  };
}
