import { useState, useMemo } from 'react';
import { Filter, X, Search, SlidersHorizontal } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { STAGE_ORDER, STAGE_LABELS } from '../../utils/constants';

export default function FilterBar({ onFilterChange }) {
  const { users } = useUserStore();
  const sales = users.filter(u => u.role === 'sales');
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    source: 'all',
    assignedTo: 'all',
    temperature: 'all',
    overdue: false,
  });

  const sources = ['manual', 'google_ads', 'facebook_ads', 'instagram_ads', 'referral', 'website', 'cold_call', 'csv_import'];
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && v !== 'all' && v !== false).length;

  const handleChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange?.(next);
  };

  const clearAll = () => {
    const cleared = { search: '', status: 'all', source: 'all', assignedTo: 'all', temperature: 'all', overdue: false };
    setFilters(cleared);
    onFilterChange?.(cleared);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-ghost" />
          <input
            type="text"
            value={filters.search}
            onChange={e => handleChange('search', e.target.value)}
            placeholder="Search leads..."
            className="w-full bg-card/50 border border-white/[0.04] rounded-xl pl-9 pr-3 py-2 text-[12px] text-txt-glow outline-none focus:border-cyan/30 placeholder:text-txt-ghost"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
            isOpen || activeCount > 0
              ? 'bg-cyan/10 border-cyan/20 text-cyan'
              : 'bg-card/50 border-white/[0.04] text-txt-ghost hover:text-txt-dim'
          }`}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan text-void text-[8px] font-black flex items-center justify-center">{activeCount}</span>
          )}
        </button>

        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-bold text-rose hover:bg-rose/10 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filter Row */}
      {isOpen && (
        <div className="flex flex-wrap items-center gap-2 p-3 glass-3d rounded-xl">
          <select value={filters.status} onChange={e => handleChange('status', e.target.value)}
            className="bg-input border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-txt-glow outline-none">
            <option value="all">All Stages</option>
            {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>

          <select value={filters.source} onChange={e => handleChange('source', e.target.value)}
            className="bg-input border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-txt-glow outline-none">
            <option value="all">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>

          <select value={filters.assignedTo} onChange={e => handleChange('assignedTo', e.target.value)}
            className="bg-input border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-txt-glow outline-none">
            <option value="all">All Reps</option>
            {sales.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <select value={filters.temperature} onChange={e => handleChange('temperature', e.target.value)}
            className="bg-input border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-txt-glow outline-none">
            <option value="all">All Temps</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🟡 Warm</option>
            <option value="cold">🔵 Cold</option>
          </select>

          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-input border border-white/[0.04] cursor-pointer">
            <input type="checkbox" checked={filters.overdue} onChange={e => handleChange('overdue', e.target.checked)} className="rounded" />
            <span className="text-[11px] text-txt-dim font-bold">Overdue Only</span>
          </label>
        </div>
      )}
    </div>
  );
}

// Helper to apply filters to leads array
export function applyFilters(leads, filters) {
  if (!filters) return leads;
  let filtered = [...leads];
  
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(l => l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q));
  }
  if (filters.status !== 'all') filtered = filtered.filter(l => l.status === filters.status);
  if (filters.source !== 'all') filtered = filtered.filter(l => l.source === filters.source);
  if (filters.assignedTo !== 'all') filtered = filtered.filter(l => l.assigned_to === filters.assignedTo);
  if (filters.temperature !== 'all') {
    const score = filters.temperature === 'hot' ? 70 : filters.temperature === 'warm' ? 40 : 0;
    const max = filters.temperature === 'hot' ? 100 : filters.temperature === 'warm' ? 69 : 39;
    filtered = filtered.filter(l => (l.lead_score || 0) >= score && (l.lead_score || 0) <= max);
  }
  if (filters.overdue) {
    const now = new Date();
    filtered = filtered.filter(l => l.next_follow_up && new Date(l.next_follow_up) < now && !['converted', 'lost'].includes(l.status));
  }
  return filtered;
}
