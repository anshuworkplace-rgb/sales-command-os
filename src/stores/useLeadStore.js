import { create } from 'zustand';
import { leadService } from '../services/leadService';
import useUserStore from './useUserStore';
import useToastStore from './useToastStore';
import { optimistic, optimisticAdd, optimisticDelete } from '../lib/optimistic';

// ── Optimistic mutation wrappers (defined once, reused in store) ──

const _addLead = optimisticAdd({
  key: 'leads',
  remote: (leadData) => leadService.createLead(leadData),
  rollbackMessage: 'Failed to create lead',
  successMessage: (input, result) => `Lead "${result.name || result.phone || 'New'}" created`,
});

const _updateLead = optimistic({
  key: 'leads',
  mutate: (leads, { id, updates }) =>
    leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
  remote: ({ id, updates, expectedVersion }) => leadService.updateLead(id, updates, expectedVersion),
  rollbackMessage: 'Failed to update lead',
});

const _deleteLead = optimisticDelete({
  key: 'leads',
  remote: (id) => leadService.deleteLead(id),
  rollbackMessage: 'Lead deleted',
  undoRemote: (item) => leadService.createLead(item),
});

const _changeStage = optimistic({
  key: 'leads',
  mutate: (leads, { id, newStatus }) =>
    leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
  remote: ({ id, newStatus, expectedVersion }) => leadService.updateStatus(id, newStatus, expectedVersion),
  rollbackMessage: 'Failed to change stage',
  successMessage: ({ newStatus }) => `Stage changed to ${newStatus}`,
});

const _rescheduleFollowUp = optimistic({
  key: 'leads',
  mutate: (leads, { leadId, newDate, nextStep, followUpNote }) =>
    leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            next_follow_up: newDate,
            ...(nextStep !== null && { next_step: nextStep }),
            ...(followUpNote !== null && { follow_up_note: followUpNote }),
          }
        : l,
    ),
  remote: ({ leadId, newDate, nextStep, followUpNote, expectedVersion }) =>
    leadService.updateFollowUp(leadId, newDate, nextStep, followUpNote, expectedVersion),
  rollbackMessage: 'Failed to reschedule follow-up',
});

// ─────────────────────────────────────────────────────────────────────────────

const useLeadStore = create((set, get) => ({
  leads: [],
  activities: [],
  isLoading: false,
  error: null,
  onConflict: null,

  setOnConflict: (callback) => set({ onConflict: callback }),

  // ── INIT (non-optimistic — full server fetch) ──
  fetchData: async () => {
    try {
      set({ isLoading: true, error: null });
      const leads = await leadService.getLeads();
      set({ leads });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── LEAD CRUD (optimistic) ──

  addLead: async (leadData) => {
    try {
      set({ isLoading: true });
      const result = await _addLead(set, get, leadData);
      return result;
    } catch (error) {
      console.error('Failed to add lead:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateLead: async (leadId, updates, forceVersion = null) => {
    const currentLead = get().leads.find((l) => l.id === leadId);
    const expectedVersion = forceVersion !== null ? forceVersion : (currentLead?.version || 1);
    try {
      await _updateLead(set, get, { id: leadId, updates, expectedVersion });
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT') {
        const latestLead = await leadService.getLead(leadId);
        if (get().onConflict) {
          get().onConflict({
            leadId,
            localUpdates: updates,
            serverLead: latestLead,
          });
        } else {
          useToastStore.getState().addToast('Concurrency Conflict: Lead updated by another user. Reloading...', 'error');
          set((state) => ({
            leads: state.leads.map((l) => (l.id === leadId ? latestLead : l)),
          }));
        }
        throw error;
      }
      throw error;
    }
  },

  deleteLead: async (leadId) => {
    await _deleteLead(set, get, leadId);
  },

  // ── STAGE MANAGEMENT (optimistic) ──
  changeStage: async (leadId, newStatus) => {
    const currentLead = get().leads.find((l) => l.id === leadId);
    const expectedVersion = currentLead?.version || 1;
    try {
      await _changeStage(set, get, { id: leadId, newStatus, expectedVersion });
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT') {
        const latestLead = await leadService.getLead(leadId);
        if (get().onConflict) {
          get().onConflict({
            leadId,
            localUpdates: { status: newStatus },
            serverLead: latestLead,
          });
        } else {
          useToastStore.getState().addToast('Concurrency Conflict: Stage update failed. Reloading...', 'error');
          set((state) => ({
            leads: state.leads.map((l) => (l.id === leadId ? latestLead : l)),
          }));
        }
        throw error;
      }
      throw error;
    }
  },

  // ── REVENUE ──
  addRevenue: async (leadId, amount) => {
    try {
      const currentLead = get().leads.find((l) => l.id === leadId);
      const expectedVersion = currentLead?.version || 1;
      await leadService.updateRevenue(leadId, amount, expectedVersion);
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT') {
        const latestLead = await leadService.getLead(leadId);
        useToastStore.getState().addToast('Concurrency Conflict: Revenue update failed. Reloading...', 'error');
        set((state) => ({
          leads: state.leads.map((l) => (l.id === leadId ? latestLead : l)),
        }));
      } else {
        console.error('Failed to add revenue:', error);
      }
    }
  },

  // ── FOLLOW-UP ACTIONS ──
  completeFollowUp: async (leadId) => {
    try {
      const lead = get().leads.find((l) => l.id === leadId);
      if (!lead) return;

      const user = useUserStore.getState().currentUserProfile;
      if (!user) return;

      await leadService.addNote(leadId, user.id, 'Follow-up completed');

      const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const expectedVersion = lead.version || 1;
      const updated = await leadService.updateFollowUp(leadId, nextDate, null, null, expectedVersion);

      // Optimistically update the lead in-place
      set((state) => ({
        leads: state.leads.map((l) =>
          l.id === leadId ? updated : l,
        ),
      }));
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT') {
        const latestLead = await leadService.getLead(leadId);
        useToastStore.getState().addToast('Concurrency Conflict: Follow-up complete failed. Reloading...', 'error');
        set((state) => ({
          leads: state.leads.map((l) => (l.id === leadId ? latestLead : l)),
        }));
      } else {
        console.error('Failed to complete follow-up:', error);
      }
    }
  },

  rescheduleFollowUp: async (leadId, newDate, nextStep = null, followUpNote = null) => {
    const currentLead = get().leads.find((l) => l.id === leadId);
    const expectedVersion = currentLead?.version || 1;
    try {
      await _rescheduleFollowUp(set, get, { leadId, newDate, nextStep, followUpNote, expectedVersion });
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT') {
        const latestLead = await leadService.getLead(leadId);
        if (get().onConflict) {
          get().onConflict({
            leadId,
            localUpdates: { next_follow_up: newDate, next_step: nextStep, follow_up_note: followUpNote },
            serverLead: latestLead,
          });
        } else {
          useToastStore.getState().addToast('Concurrency Conflict: Reschedule failed. Reloading...', 'error');
          set((state) => ({
            leads: state.leads.map((l) => (l.id === leadId ? latestLead : l)),
          }));
        }
        throw error;
      }
      throw error;
    }
  },

  // ── NOTES ──
  addNote: async (leadId, note) => {
    try {
      const user = useUserStore.getState().currentUserProfile;
      if (!user) throw new Error('Not authenticated');
      await leadService.addNote(leadId, user.id, note);
      await get().fetchActivitiesForLead(leadId);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  },

  // ── ACTIVITIES ──
  fetchActivitiesForLead: async (leadId) => {
    try {
      const activities = await leadService.getActivities(leadId);
      set({ activities });
      return activities;
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  },

  fetchAllActivities: async () => {
    try {
      const activities = await leadService.getAllActivities();
      set({ activities });
    } catch (error) {
      console.error('Failed to fetch all activities:', error);
    }
  },

  // ── SELECTORS ──
  getLeadById: (id) => get().leads.find((l) => l.id === id),
  getLeadsByStage: (stage) => get().leads.filter((l) => l.status === stage),
  getLeadsByUser: (userId) => get().leads.filter((l) => l.assigned_to === userId),
  getWebLeads: () => get().leads.filter((l) => l.lead_type === 'web_lead'),
  getMassDataLeads: () => get().leads.filter((l) => l.lead_type === 'mass_data'),
  getFollowUpQueue: () =>
    get()
      .leads.filter(
        (l) => !['deployed', 'lost'].includes(l.status) && l.next_follow_up,
      )
      .sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up)),
}));

export default useLeadStore;
