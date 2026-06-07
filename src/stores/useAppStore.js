/**
 * NEXUS — App Store
 * Global application state managed with Zustand.
 * Controls navigation, UI panels, and system-level state.
 */
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  /* ─── Navigation ─── */
  currentView: 'mission-control',
  setView: (view) => set({ currentView: view }),

  /* ─── Sidebar ─── */
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  /* ─── Command Palette (⌘K) ─── */
  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  /* ─── AI Copilot Panel ─── */
  copilotOpen: false,
  toggleCopilot: () => set((state) => ({ copilotOpen: !state.copilotOpen })),
  openCopilot: () => set({ copilotOpen: true }),
  closeCopilot: () => set({ copilotOpen: false }),

  /* ─── War Rooms ─── */
  activeWarRoom: null,
  setActiveWarRoom: (warRoomId) => set({ activeWarRoom: warRoomId }),
  clearActiveWarRoom: () => set({ activeWarRoom: null }),

  /* ─── Notifications ─── */
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          read: false,
          ...notification,
        },
        ...state.notifications,
      ].slice(0, 99), // Cap at 99 notifications
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  /* ─── Global Loading State ─── */
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  /* ─── Modal / Dialog Stack ─── */
  activeModal: null,
  modalData: null,
  openModal: (modalName, data = null) =>
    set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));

export default useAppStore;
