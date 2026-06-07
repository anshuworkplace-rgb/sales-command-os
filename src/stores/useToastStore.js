/**
 * TOAST NOTIFICATION STORE
 * Manages stackable toast notifications with auto-dismiss
 */
import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (type, message, options = {}) => {
    const id = ++toastId;
    const duration = options.duration || 5000;
    const toast = {
      id,
      type, // 'success' | 'warning' | 'error' | 'info'
      message,
      title: options.title || null,
      icon: options.icon || null,
      duration,
      createdAt: Date.now(),
      // Optional action button (e.g. Undo) — { label: string, onClick: () => void }
      action: options.action || null,
    };

    set(state => ({ toasts: [...state.toasts, toast].slice(-5) })); // Max 5 toasts

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  clearAll: () => set({ toasts: [] }),

  // Convenience methods
  success: (msg, opts) => get().addToast('success', msg, { icon: '✅', ...opts }),
  warning: (msg, opts) => get().addToast('warning', msg, { icon: '⚠️', ...opts }),
  error: (msg, opts) => get().addToast('error', msg, { icon: '❌', ...opts }),
  info: (msg, opts) => get().addToast('info', msg, { icon: 'ℹ️', ...opts }),
}));

export default useToastStore;
