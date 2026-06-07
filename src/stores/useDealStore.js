import { create } from 'zustand';
import { dealService } from '../services/dealService';
import useToastStore from './useToastStore';
import { optimistic } from '../lib/optimistic';

// ── Optimistic mutation wrapper ──

const _updateDealStage = optimistic({
  key: 'deals',
  mutate: (deals, { id, newStage }) =>
    deals.map((d) => (d.id === id ? { ...d, stage: newStage } : d)),
  remote: ({ id, newStage }) => dealService.updateStage(id, newStage),
  rollbackMessage: 'Failed to update deal stage',
  successMessage: ({ newStage }) => `Deal moved to ${newStage}`,
});

// ─────────────────────────────────────────────────────────────────────────────

const useDealStore = create((set, get) => ({
  deals: [],
  isLoading: false,

  // ── INIT (non-optimistic — full server fetch) ──
  fetchDeals: async () => {
    try {
      set({ isLoading: true });
      const deals = await dealService.getDeals();
      set({ deals });
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── STAGE UPDATE (optimistic) ──
  updateDealStage: async (dealId, newStage) => {
    await _updateDealStage(set, get, { id: dealId, newStage });
  },

  // ── SELECTORS ──
  getDealsByStage: (stage) => get().deals.filter((d) => d.stage === stage),
  getTotalPipelineValue: () =>
    get()
      .deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce((s, d) => s + Number(d.value || 0), 0),
  getWeightedPipeline: () =>
    get()
      .deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce(
        (s, d) => s + (Number(d.value || 0) * (d.probability || 0)) / 100,
        0,
      ),
}));

export default useDealStore;
