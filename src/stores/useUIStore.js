import { create } from 'zustand';

const getSavedFilters = () => {
  try {
    const data = localStorage.getItem('saved_smart_filters');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const useUIStore = create((set, get) => ({
  // ── PAGE NAVIGATION (3 core views + sheets) ──
  activePage: 'command', // 'command' | 'pipeline' | 'pulse' | 'sheets'
  setActivePage: (page) => set({ activePage: page }),

  // ── SIDEBAR ──
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── PANELS ──
  selectedLeadId: null,
  isLeadDetailOpen: false,
  isAddLeadOpen: false,
  isImportOpen: false,
  isCommandPaletteOpen: false,
  isNotificationCenterOpen: false,
  focusedLeadId: null,
  isShortcutsOverlayOpen: false,

  // ── ADD LEAD DEFAULTS ──
  addLeadDefaults: null,

  viewFilter: 'all',       // 'all' | userId
  leadTypeFilter: 'all',   // 'all' | 'web_lead' | 'mass_data' | 'referral'
  stageFilter: 'all',      // 'all' | stage value
  selectedMonth: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date()),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  searchQuery: '',

  // ── SMART FILTERS & MULTI-SORT ──
  savedSmartFilters: getSavedFilters(),
  activeSmartFilterId: null,
  multiSort: [{ column: 'created_at', direction: 'desc' }],

  // ── PIPELINE VIEW ──
  pipelineView: 'board',   // 'board' | 'table'

  // ── REALTIME ──
  lastSynced: new Date(),
  setLastSynced: (date) => set({ lastSynced: date }),

  // ── CALL QUEUE (My Day) ──
  callQueueIndex: 0,
  callStreak: 0,
  todayCallsCompleted: 0,
  setCallQueueIndex: (idx) => set({ callQueueIndex: idx }),
  incrementStreak: () => set(s => ({ callStreak: s.callStreak + 1, todayCallsCompleted: s.todayCallsCompleted + 1 })),
  resetStreak: () => set({ callStreak: 0 }),

  // ── ACTIONS ──
  openLeadDetail: (leadId) => set({ selectedLeadId: leadId, isLeadDetailOpen: true }),
  closeLeadDetail: () => set({ selectedLeadId: null, isLeadDetailOpen: false }),

  openAddLead: (defaults = null) => set({ isAddLeadOpen: true, addLeadDefaults: defaults }),
  closeAddLead: () => set({ isAddLeadOpen: false, addLeadDefaults: null }),

  openImport: () => set({ isImportOpen: true }),
  closeImport: () => set({ isImportOpen: false }),

  toggleCommandPalette: () => set(s => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  toggleNotificationCenter: () => set(s => ({ isNotificationCenterOpen: !s.isNotificationCenterOpen })),
  closeNotificationCenter: () => set({ isNotificationCenterOpen: false }),

  setFocusedLeadId: (id) => set({ focusedLeadId: id }),
  toggleShortcutsOverlay: () => set(s => ({ isShortcutsOverlayOpen: !s.isShortcutsOverlayOpen })),
  openShortcutsOverlay: () => set({ isShortcutsOverlayOpen: true }),
  closeShortcutsOverlay: () => set({ isShortcutsOverlayOpen: false }),

  setViewFilter: (filter) => set({ viewFilter: filter, activeSmartFilterId: null }),
  setLeadTypeFilter: (filter) => set({ leadTypeFilter: filter, activeSmartFilterId: null }),
  setStageFilter: (filter) => set({ stageFilter: filter, activeSmartFilterId: null }),
  setSearchQuery: (q) => set({ searchQuery: q, activeSmartFilterId: null }),
  setPipelineView: (view) => set({ pipelineView: view }),

  saveSmartFilter: (name) => {
    const id = 'sf_' + Date.now();
    const currentFilters = {
      id,
      name,
      searchQuery: get().searchQuery,
      viewFilter: get().viewFilter,
      leadTypeFilter: get().leadTypeFilter,
      stageFilter: get().stageFilter,
      multiSort: get().multiSort,
    };
    
    const updated = [...get().savedSmartFilters, currentFilters];
    localStorage.setItem('saved_smart_filters', JSON.stringify(updated));
    set({ savedSmartFilters: updated, activeSmartFilterId: id });
  },

  deleteSmartFilter: (id) => {
    const updated = get().savedSmartFilters.filter(sf => sf.id !== id);
    localStorage.setItem('saved_smart_filters', JSON.stringify(updated));
    const nextState = { savedSmartFilters: updated };
    if (get().activeSmartFilterId === id) {
      nextState.activeSmartFilterId = null;
    }
    set(nextState);
  },

  applySmartFilter: (id) => {
    const filter = get().savedSmartFilters.find(sf => sf.id === id);
    if (!filter) return;
    set({
      activeSmartFilterId: id,
      searchQuery: filter.searchQuery || '',
      viewFilter: filter.viewFilter || 'all',
      leadTypeFilter: filter.leadTypeFilter || 'all',
      stageFilter: filter.stageFilter || 'all',
      multiSort: filter.multiSort || [{ column: 'created_at', direction: 'desc' }],
    });
  },

  clearSmartFilter: () => {
    set({
      activeSmartFilterId: null,
      searchQuery: '',
      viewFilter: 'all',
      leadTypeFilter: 'all',
      stageFilter: 'all',
      multiSort: [{ column: 'created_at', direction: 'desc' }],
    });
  },

  setMultiSort: (sortConfig) => set({ multiSort: sortConfig, activeSmartFilterId: null }),

  // ── Backward compat shims ──
  activeTab: 'command',
  setActiveTab: (tab) => {
    const mapping = { dashboard: 'command', today: 'command', coach: 'command', stream: 'command', workspace: 'command', home: 'command' };
    set({ activePage: mapping[tab] || tab, activeTab: tab });
  },
}));

export default useUIStore;
