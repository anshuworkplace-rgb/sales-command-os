import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ExternalLink, 
  Download, 
  Upload, 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit2, 
  Play, 
  MoreHorizontal,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Clock,
  Activity,
  Zap,
  ShieldAlert
} from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { STAGE_LABELS, STAGE_CSS, STAGE_ORDER, LEAD_SOURCES } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import useToastStore from '../../stores/useToastStore';
import ConflictResolutionModal from '../common/ConflictResolutionModal';

const PAGE_SIZE = 50;

export default function ClientsTable() {
  const shouldReduceMotion = useReducedMotion();
  const { leads, updateLead, deleteLead, isLoading, setOnConflict } = useLeadStore();
  const { 
    openLeadDetail, 
    viewFilter, 
    searchQuery, 
    setSearchQuery, 
    stageFilter, 
    setStageFilter, 
    focusedLeadId,
    savedSmartFilters,
    activeSmartFilterId,
    saveSmartFilter,
    deleteSmartFilter,
    applySmartFilter,
    clearSmartFilter,
    multiSort,
    setMultiSort,
    openImport
  } = useUIStore();
  
  const { getCurrentUser, users } = useUserStore();
  const { addToast } = useToastStore();
  const user = getCurrentUser();
  const isM = ['manager', 'admin'].includes(user?.role);

  // States
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [agingFilter, setAgingFilter] = useState('all');
  
  // Inline edit state
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');

  // Smart filter UI state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Optimistic lock conflict state
  const [conflict, setConflict] = useState(null);

  // SLA Stats calculation
  const slaStats = useMemo(() => {
    const now = new Date();
    const myLeads = isM && viewFilter === 'all' ? leads : leads.filter(l => l.assigned_to === user?.id);
    const freshLeads = myLeads.filter(l => ['new', 'fresh_enquiry'].includes(l.status));
    
    // SLA Violations: status is fresh and enquiry_date is older than 15 mins
    const violations = freshLeads.filter(l => {
      const enq = new Date(l.enquiry_date || l.created_at);
      return (now - enq) / 60000 > 15;
    });

    // SLA Urgent: fresh and enquiry_date is less than 15 mins ago
    const urgent = freshLeads.filter(l => {
      const enq = new Date(l.enquiry_date || l.created_at);
      return (now - enq) / 60000 <= 15;
    });

    // Touched leads for average response time
    const touchedLeads = myLeads.filter(l => l.first_contact_at && (l.enquiry_date || l.created_at));
    const responseTimes = touchedLeads.map(l => {
      const start = new Date(l.enquiry_date || l.created_at);
      const end = new Date(l.first_contact_at);
      return (end - start) / 60000; // in minutes
    });
    
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length)
      : 0;

    const withinSLA = responseTimes.filter(t => t <= 15).length;
    const slaSuccessRate = responseTimes.length > 0
      ? Math.round((withinSLA / responseTimes.length) * 100)
      : 100; // default

    return {
      violationsCount: violations.length,
      urgentCount: urgent.length,
      avgResponseTime,
      slaSuccessRate
    };
  }, [leads, isM, viewFilter, user]);

  // Set up the conflict handler
  useEffect(() => {
    setOnConflict(setConflict);
    return () => setOnConflict(null);
  }, [setOnConflict]);

  // Sync search query from store if it changes globally
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  const filtered = useMemo(() => {
    let data = isM && viewFilter === 'all' ? leads : leads.filter(l => l.assigned_to === user?.id);
    const q = localSearch.trim().toLowerCase();
    if (q.length >= 2) {
      data = data.filter(l =>
        [l.name, l.phone, l.city, l.notes, l.follow_up_note]
          .some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    if (stageFilter !== 'all') data = data.filter(l => l.status === stageFilter);
    
    // Dynamic Lead Aging Filters
    if (agingFilter !== 'all') {
      const now = new Date();
      data = data.filter(l => {
        const enq = new Date(l.enquiry_date || l.created_at);
        const diffMins = (now - enq) / 60000;
        const diffHours = diffMins / 60;
        
        switch (agingFilter) {
          case 'sla_urgent':
            return ['new', 'fresh_enquiry'].includes(l.status) && diffMins <= 15;
          case 'hot_2h':
            return ['new', 'fresh_enquiry'].includes(l.status) && diffHours <= 2;
          case 'today':
            const enqDateStr = enq.toISOString().split('T')[0];
            const todayStr = now.toISOString().split('T')[0];
            return enqDateStr === todayStr;
          case 'cold_48h':
            return ['new', 'fresh_enquiry'].includes(l.status) && diffHours > 48;
          case 'overdue':
            return l.next_follow_up && new Date(l.next_follow_up) < now && !['converted', 'deployed', 'lost'].includes(l.status);
          default:
            return true;
        }
      });
    }

    // Multi-sort logic
    data = [...data].sort((a, b) => {
      for (const sortObj of multiSort) {
        const { column, direction } = sortObj;
        let av = a[column];
        let bv = b[column];
        
        // Special sorting for numbers
        if (column === 'revenue') {
          const numA = Number(av || 0);
          const numB = Number(bv || 0);
          if (numA !== numB) {
            return direction === 'desc' ? numB - numA : numA - numB;
          }
          continue;
        }

        // Special sorting for dates
        if (column === 'next_follow_up' || column === 'created_at' || column === 'enquiry_date') {
          if (!av && !bv) continue;
          if (!av) return 1;
          if (!bv) return -1;
          const timeA = new Date(av).getTime();
          const timeB = new Date(bv).getTime();
          if (timeA !== timeB) {
            return direction === 'desc' ? timeB - timeA : timeA - timeB;
          }
          continue;
        }

        // Default string comparison
        const strA = String(av || '').toLowerCase();
        const strB = String(bv || '').toLowerCase();
        if (strA !== strB) {
          return direction === 'desc' ? strB.localeCompare(strA) : strA.localeCompare(strB);
        }
      }
      // Stable sort fallback
      return new Date(b.enquiry_date || b.created_at || 0) - new Date(a.enquiry_date || a.created_at || 0);
    });

    return data;
  }, [leads, isM, viewFilter, user, localSearch, stageFilter, agingFilter, multiSort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedData = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const toggleSort = (column, isShiftKey = false) => {
    const existing = multiSort.find(s => s.column === column);
    let nextSort = [];
    
    if (isShiftKey) {
      if (existing) {
        if (existing.direction === 'desc') {
          // Remove sort rule
          nextSort = multiSort.filter(s => s.column !== column);
        } else {
          // Toggle direction
          nextSort = multiSort.map(s => s.column === column ? { ...s, direction: 'desc' } : s);
        }
      } else {
        // Add sorting rule
        nextSort = [...multiSort, { column, direction: 'asc' }];
      }
    } else {
      // Normal click: replace all sort rules with this one
      if (existing && existing.direction === 'asc') {
        nextSort = [{ column, direction: 'desc' }];
      } else {
        nextSort = [{ column, direction: 'asc' }];
      }
    }

    if (nextSort.length === 0) {
      nextSort = [{ column: 'enquiry_date', direction: 'desc' }];
    }
    setMultiSort(nextSort);
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === paginatedData.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(paginatedData.map(l => l.id));
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExport = () => {
    const dataToExport = selectedLeads.length > 0 ? leads.filter(l => selectedLeads.includes(l.id)) : filtered;
    const csvHeader = 'Name,Phone,City,Capital,Stage,Revenue,Next Follow Up\n';
    const csvContent = dataToExport.map(l => `"${l.name || ''}","${l.phone || ''}","${l.city || ''}","${l.capital || ''}","${STAGE_LABELS[l.status] || ''}","${l.revenue || 0}","${l.next_follow_up || ''}"`).join('\n');
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SalesOS_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Export downloaded successfully', 'success');
  };

  const handleBulkStageChange = async (newStage) => {
    try {
      await Promise.all(selectedLeads.map(id => updateLead(id, { status: newStage })));
      addToast(`Updated ${selectedLeads.length} leads to ${STAGE_LABELS[newStage]}`, 'success');
      setSelectedLeads([]);
    } catch (e) {
      addToast('Some bulk updates failed due to conflict or errors', 'warning');
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedLeads.length} clients permanently?`)) {
      try {
        await Promise.all(selectedLeads.map(id => deleteLead(id)));
        addToast(`Successfully deleted ${selectedLeads.length} clients`, 'success');
        setSelectedLeads([]);
      } catch (e) {
        addToast('Delete failed: ' + e.message, 'error');
      }
    }
  };

  const handleBulkAssign = async (userId) => {
    try {
      await Promise.all(selectedLeads.map(id => updateLead(id, { assigned_to: userId })));
      addToast(`Reassigned ${selectedLeads.length} clients successfully`, 'success');
      setSelectedLeads([]);
    } catch (e) {
      addToast('Bulk assignment failed: ' + e.message, 'error');
    }
  };

  const startEdit = (id, field, val) => {
    setEditingCell({ id, field });
    setEditValue(String(val !== null && val !== undefined ? val : ''));
  };

  const handleInlineSave = async (leadId, field, val) => {
    let finalVal = val.trim();
    if (field === 'revenue') {
      finalVal = Number(val.replace(/[^\d.]/g, '')) || 0;
    }
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead || String(lead[field] || '') === String(finalVal)) return;

    try {
      await updateLead(leadId, { [field]: finalVal });
      addToast('Saved inline changes', 'success');
    } catch (e) {
      if (e.message !== 'VERSION_CONFLICT') {
        addToast('Save failed: ' + e.message, 'error');
      }
    }
  };

  const repName = (id) => users.find(u => u.id === id)?.name?.split(' ')[0] || '-';

  return (
    <div className="p-5 lg:p-6 space-y-4 max-w-7xl mx-auto relative pb-20">
      {/* SLA & Aging Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="glass-card p-4 flex flex-col justify-between border-white/[0.05] relative overflow-hidden bg-void shadow-glow-blue/2">
          <div className="flex justify-between items-start text-tx-ghost">
            <span className="text-[10px] uppercase font-black tracking-wider">Active SLA Violations</span>
            <ShieldAlert size={14} className={slaStats.violationsCount > 0 ? "text-coral animate-pulse" : "text-tx-ghost"} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${slaStats.violationsCount > 0 ? "text-coral text-glow-coral" : "text-tx-bright"}`}>
              {slaStats.violationsCount}
            </span>
            <span className="text-[10px] text-tx-ghost">leads (&gt;15m untouched)</span>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between border-white/[0.05] relative overflow-hidden bg-void">
          <div className="flex justify-between items-start text-tx-ghost">
            <span className="text-[10px] uppercase font-black tracking-wider">SLA Response Rate</span>
            <Activity size={14} className="text-mint" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${slaStats.slaSuccessRate < 80 ? "text-coral" : "text-mint"}`}>
              {slaStats.slaSuccessRate}%
            </span>
            <span className="text-[10px] text-tx-ghost">within 15m threshold</span>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between border-white/[0.05] relative overflow-hidden bg-void">
          <div className="flex justify-between items-start text-tx-ghost">
            <span className="text-[10px] uppercase font-black tracking-wider">Avg Response SLA</span>
            <Clock size={14} className="text-electric" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-electric text-glow-electric">
              {slaStats.avgResponseTime}m
            </span>
            <span className="text-[10px] text-tx-ghost">average touch time</span>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between border-white/[0.05] relative overflow-hidden bg-void">
          <div className="flex justify-between items-start text-tx-ghost">
            <span className="text-[10px] uppercase font-black tracking-wider">SLA Urgent Leads</span>
            <Zap size={14} className={slaStats.urgentCount > 0 ? "text-amber-400 animate-bounce" : "text-tx-ghost"} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${slaStats.urgentCount > 0 ? "text-amber-400 animate-pulse" : "text-tx-bright"}`}>
              {slaStats.urgentCount}
            </span>
            <span className="text-[10px] text-tx-ghost">fresh (&lt;15m old)</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap bg-white/[0.02] p-3 rounded-2xl border border-white/[0.05]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-ghost" />
            <input
              value={localSearch}
              onChange={e => { setLocalSearch(e.target.value); setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, phone, city or notes..."
              className="w-full bg-void border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-[12px] text-tx-bright focus:border-electric/50 outline-none transition"
            />
          </div>
        </div>
        
        {/* Stage Filter */}
        <div className="flex items-center gap-2 bg-void border border-white/[0.06] rounded-xl px-2 py-1 select-none">
          <Filter size={14} className="text-tx-ghost ml-1" />
          <select
            value={stageFilter}
            onChange={e => { setStageFilter(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-[12px] text-tx-bright outline-none cursor-pointer py-1 pr-2 font-bold"
          >
            <option value="all" className="bg-[#0b0f19]">All Stages</option>
            {STAGE_ORDER.map(s => <option key={s} value={s} className="bg-[#0b0f19]">{STAGE_LABELS[s]}</option>)}
          </select>
        </div>

        {/* Lead Aging Filter */}
        <div className="flex items-center gap-2 bg-void border border-white/[0.06] rounded-xl px-2 py-1 select-none">
          <Clock size={14} className="text-tx-ghost ml-1" />
          <select
            value={agingFilter}
            onChange={e => { setAgingFilter(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-[12px] text-tx-bright outline-none cursor-pointer py-1 pr-2 font-bold"
          >
            <option value="all" className="bg-[#0b0f19]">All Lead Ages</option>
            <option value="sla_urgent" className="bg-[#0b0f19] text-coral font-bold">⚠️ SLA Urgent (&lt;15m)</option>
            <option value="hot_2h" className="bg-[#0b0f19] text-amber-400">🔥 Hot Leads (&lt;2h)</option>
            <option value="today" className="bg-[#0b0f19] text-electric">📅 Received Today</option>
            <option value="cold_48h" className="bg-[#0b0f19] text-tx-muted">❄️ Cold Leads (&gt;48h)</option>
            <option value="overdue" className="bg-[#0b0f19] text-coral font-black">🚨 Overdue Follow-up</option>
          </select>
        </div>

        {/* Smart Filters Dropdown */}
        <div className="flex items-center gap-2 bg-void border border-white/[0.06] rounded-xl px-2 py-1 select-none">
          <Sparkles size={14} className="text-electric ml-1 animate-pulse" />
          <select
            value={activeSmartFilterId || ''}
            onChange={e => {
              const val = e.target.value;
              if (val === 'save-new') {
                setShowSaveModal(true);
              } else if (val === 'clear') {
                clearSmartFilter();
              } else if (val) {
                applySmartFilter(val);
              }
            }}
            className="bg-transparent border-none text-[12px] text-tx-bright outline-none cursor-pointer py-1 pr-2 font-bold"
          >
            <option value="" className="bg-[#0b0f19]">Smart Filters ({savedSmartFilters.length})</option>
            {savedSmartFilters.map(sf => (
              <option key={sf.id} value={sf.id} className="bg-[#0b0f19]">{sf.name}</option>
            ))}
            <option value="save-new" className="bg-[#0b0f19] text-electric font-black">+ Save Current Filters...</option>
            {activeSmartFilterId && (
              <option value="clear" className="bg-[#0b0f19] text-coral font-bold">✕ Clear Smart Filter</option>
            )}
          </select>
          {activeSmartFilterId && (
            <button 
              onClick={(e) => { e.stopPropagation(); deleteSmartFilter(activeSmartFilterId); }} 
              className="p-1 hover:bg-white/10 rounded text-coral transition"
              title="Delete this saved filter"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {/* CSV Import CTA */}
          <button onClick={openImport} className="flex items-center gap-1.5 px-3 py-2 bg-electric/10 hover:bg-electric/25 border border-electric/30 rounded-xl text-electric hover:text-white transition text-[11px] font-bold">
            <Upload size={13} /> Import CSV
          </button>

          {/* Export Button */}
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl text-tx-ghost hover:text-tx-bright transition text-[11px] font-bold">
            <Download size={13} /> Export {selectedLeads.length > 0 ? `(${selectedLeads.length})` : 'All'}
          </button>
        </div>
      </div>

      {/* Active Sort Rules Visualizer */}
      {multiSort.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-tx-ghost bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
          <span className="font-bold uppercase tracking-wider text-[9px] text-tx-ghost">Active Sort Rules:</span>
          {multiSort.map((sort, idx) => (
            <div key={sort.column} className="flex items-center gap-1.5 bg-[#0b0f19] border border-white/[0.06] px-2.5 py-1 rounded-lg">
              <span className="font-semibold text-tx-dim capitalize">{sort.column.replace('_', ' ')}</span>
              <span className="text-electric font-bold uppercase">{sort.direction}</span>
              <button 
                onClick={() => {
                  const updated = multiSort.filter(s => s.column !== sort.column);
                  setMultiSort(updated.length > 0 ? updated : [{ column: 'enquiry_date', direction: 'desc' }]);
                }}
                className="text-coral hover:text-red-400 ml-1 font-black"
                title="Remove this sorting rule"
              >
                ✕
              </button>
            </div>
          ))}
          {multiSort.length > 1 && (
            <button onClick={() => setMultiSort([{ column: 'enquiry_date', direction: 'desc' }])} className="text-electric hover:underline font-bold ml-1 cursor-pointer">
              Reset Sorting Rules
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="glass-card-elevated overflow-hidden border-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="px-4 py-3 w-10">
                  <button onClick={handleSelectAll} className="text-tx-ghost hover:text-electric transition cursor-pointer">
                    {selectedLeads.length > 0 && selectedLeads.length === paginatedData.length ? <CheckSquare size={15} className="text-electric" /> : <Square size={15} />}
                  </button>
                </th>
                {[
                  { key: 'phone', label: 'Phone' },
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Stage' },
                  { key: 'city', label: 'City' },
                  { key: 'enquiry_date', label: 'Enquiry Date' },
                  { key: 'next_follow_up', label: 'Follow-up' },
                  ...(isM ? [{ key: 'assigned_to', label: 'Rep' }] : []),
                  { key: 'revenue', label: 'Value' },
                  { key: 'actions', label: '' }, // Inline actions
                ].map(col => {
                  const sortIndex = multiSort.findIndex(s => s.column === col.key);
                  const isSorted = sortIndex !== -1;
                  const currentSortDir = isSorted ? multiSort[sortIndex].direction : null;
                  
                  return (
                    <th
                      key={col.key}
                      onClick={(e) => col.key !== 'actions' && toggleSort(col.key, e.shiftKey)}
                      className={`px-4 py-3 text-[10px] uppercase tracking-widest font-black text-tx-ghost select-none whitespace-nowrap ${col.key !== 'actions' ? 'cursor-pointer hover:text-tx-dim transition' : ''}`}
                      title={col.key !== 'actions' ? "Click to sort. Shift+Click to multi-sort" : ""}
                    >
                      <span className="flex items-center gap-1.5">
                        {col.label}
                        {isSorted && (
                          <span className="flex items-center">
                            <ChevronDown size={11} className={`text-electric transition-transform ${currentSortDir === 'asc' ? 'rotate-180' : ''}`} />
                            {multiSort.length > 1 && (
                              <span className="text-[8px] text-electric/70 font-bold font-mono bg-electric/10 px-1 rounded ml-0.5">
                                {sortIndex + 1}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-white/[0.03] animate-pulse">
                      <td className="px-4 py-3"><div className="w-4 h-4 bg-white/5 rounded" /></td>
                      <td className="px-4 py-3"><div className="w-24 h-4 bg-white/5 rounded" /></td>
                      <td className="px-4 py-3"><div className="w-32 h-4 bg-white/5 rounded" /></td>
                      <td className="px-4 py-3"><div className="w-16 h-5 bg-white/5 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="w-20 h-4 bg-white/5 rounded" /></td>
                      <td className="px-4 py-3"><div className="w-24 h-5 bg-white/5 rounded-lg" /></td>
                      {isM && <td className="px-4 py-3"><div className="w-16 h-4 bg-white/5 rounded" /></td>}
                      <td className="px-4 py-3"><div className="w-16 h-4 bg-white/5 rounded" /></td>
                      <td className="px-4 py-3"><div className="w-6 h-6 bg-white/5 rounded" /></td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map(lead => {
                    const now = new Date();
                    const isOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < now && !['converted', 'deployed', 'lost'].includes(lead.status);
                    const isSelected = selectedLeads.includes(lead.id);

                    // SLA status check
                    let slaPulsingDot = null;
                    if (['new', 'fresh_enquiry'].includes(lead.status)) {
                      const enq = new Date(lead.enquiry_date || lead.created_at);
                      const diffMins = (now - enq) / 60000;
                      if (diffMins > 15) {
                        slaPulsingDot = (
                          <span 
                            className="inline-block w-2 h-2 rounded-full bg-coral animate-pulse flex-shrink-0"
                            style={{ boxShadow: '0 0 8px #f43f5e' }}
                            title={`SLA Violation: untouched for ${Math.round(diffMins)}m (>15m)`}
                          />
                        );
                      } else {
                        slaPulsingDot = (
                          <span 
                            className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                            style={{ boxShadow: '0 0 8px #fbbf24' }}
                            title={`SLA Urgent: untouched for ${Math.round(diffMins)}m (<=15m)`}
                          />
                        );
                      }
                    }

                    return (
                      <motion.tr
                        layout={shouldReduceMotion ? undefined : "position"}
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                        transition={shouldReduceMotion ? { duration: 0.15 } : undefined}
                        key={lead.id}
                        data-keyboard-nav="lead"
                        data-lead-id={lead.id}
                        onClick={() => openLeadDetail(lead.id)}
                        className={`border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition group relative
                          ${isSelected ? 'bg-electric/10 hover:bg-electric/[0.15]' : ''}
                          ${isOverdue && !isSelected ? 'bg-coral/[0.02]' : ''}
                          ${focusedLeadId === lead.id ? 'ring-1 ring-inset ring-electric bg-white/[0.04]' : ''}
                        `}
                      >
                        <td className="px-4 py-3" onClick={(e) => toggleSelect(lead.id, e)}>
                          <button className="text-tx-ghost/50 group-hover:text-tx-dim transition cursor-pointer">
                            {isSelected ? <CheckSquare size={15} className="text-electric" /> : <Square size={15} />}
                          </button>
                        </td>
                        
                        {/* Phone cell inline edit */}
                        <td 
                          className="px-4 py-3 text-[12px] font-mono font-bold text-tx-bright whitespace-nowrap"
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(lead.id, 'phone', lead.phone); }}
                        >
                          {editingCell?.id === lead.id && editingCell?.field === 'phone' ? (
                            <input
                              value={editValue}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              onDoubleClick={e => e.stopPropagation()}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { handleInlineSave(lead.id, 'phone', editValue); setEditingCell(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { handleInlineSave(lead.id, 'phone', editValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="bg-void border border-electric rounded px-1.5 py-0.5 text-xs text-tx-bright w-full font-mono outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{lead.phone}</span>
                              <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }} className="opacity-0 group-hover:opacity-100 p-1 bg-white/5 hover:bg-electric/20 hover:text-electric rounded text-tx-ghost transition outline-none">
                                <Phone size={10} />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Name cell inline edit */}
                        <td 
                          className="px-4 py-3 text-[12.5px] text-tx-bright font-extrabold truncate max-w-[150px]"
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(lead.id, 'name', lead.name); }}
                        >
                          {editingCell?.id === lead.id && editingCell?.field === 'name' ? (
                            <input
                              value={editValue}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              onDoubleClick={e => e.stopPropagation()}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { handleInlineSave(lead.id, 'name', editValue); setEditingCell(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { handleInlineSave(lead.id, 'name', editValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="bg-void border border-electric rounded px-1.5 py-0.5 text-xs text-tx-bright w-full font-bold outline-none"
                            />
                          ) : (
                            <span className="flex items-center gap-1.5">
                              {slaPulsingDot}
                              <span>{lead.name || 'Unknown'}</span>
                            </span>
                          )}
                        </td>

                        {/* Status dropdown inline edit */}
                        <td className="px-4 py-3">
                          <select 
                            value={lead.status}
                            onChange={(e) => { e.stopPropagation(); updateLead(lead.id, { status: e.target.value }); addToast('Stage updated inline', 'success'); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`stage-badge ${STAGE_CSS[lead.status]} text-[9px] cursor-pointer outline-none appearance-none pr-4 focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void`}
                            style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22currentColor%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22M7.247%2011.14%202.451%205.658C1.885%205.013%202.345%204%203.204%204h9.592a1%201%200%200%201%20.753%201.659l-4.796%205.48a1%201%200%200%201-1.506%200z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '8px auto' }}
                          >
                            {STAGE_ORDER.map(s => <option key={s} value={s} className="bg-[#0b0f19] text-tx-bright">{STAGE_LABELS[s]}</option>)}
                          </select>
                        </td>

                        {/* City cell inline edit */}
                        <td 
                          className="px-4 py-3 text-[11px] text-tx-dim"
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(lead.id, 'city', lead.city); }}
                        >
                          {editingCell?.id === lead.id && editingCell?.field === 'city' ? (
                            <input
                              value={editValue}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              onDoubleClick={e => e.stopPropagation()}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { handleInlineSave(lead.id, 'city', editValue); setEditingCell(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { handleInlineSave(lead.id, 'city', editValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="bg-void border border-electric rounded px-1.5 py-0.5 text-xs text-tx-bright w-full outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin size={10} className="text-tx-ghost" />
                              <span>{lead.city || '-'}</span>
                            </div>
                          )}
                        </td>

                        {/* Enquiry Date cell */}
                        <td className="px-4 py-3 text-[11px] whitespace-nowrap text-tx-dim">
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} className="text-tx-ghost" />
                            <span>{lead.enquiry_date || lead.created_at ? formatDate(lead.enquiry_date || lead.created_at).split(',')[0] : '—'}</span>
                          </span>
                        </td>

                        {/* Follow-up cell (Static date visualizer) */}
                        <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                          {lead.next_follow_up ? (
                            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isOverdue ? 'bg-coral/10 text-coral border-coral/20 font-bold' : 'bg-white/5 border-white/5 text-tx-dim'}`}>
                              {isOverdue && <AlertTriangle size={10} />}
                              {formatDate(lead.next_follow_up)}
                            </span>
                          ) : <span className="text-tx-ghost px-2">—</span>}
                        </td>

                        {/* Rep Assignment cell */}
                        {isM && (
                          <td className="px-4 py-3 text-[11px] text-tx-dim font-bold">{repName(lead.assigned_to)}</td>
                        )}

                        {/* Revenue cell inline edit */}
                        <td 
                          className="px-4 py-3 text-[12px] font-black text-mint font-mono tracking-tight"
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(lead.id, 'revenue', lead.revenue); }}
                        >
                          {editingCell?.id === lead.id && editingCell?.field === 'revenue' ? (
                            <input
                              value={editValue}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              onDoubleClick={e => e.stopPropagation()}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { handleInlineSave(lead.id, 'revenue', editValue); setEditingCell(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { handleInlineSave(lead.id, 'revenue', editValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="bg-void border border-electric rounded px-1.5 py-0.5 text-xs text-mint w-full font-mono outline-none"
                            />
                          ) : (
                            lead.revenue > 0 ? `₹${Number(lead.revenue).toLocaleString('en-IN')}` : '-'
                          )}
                        </td>

                        {/* Open detail sheet */}
                        <td className="px-4 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); openLeadDetail(lead.id); }} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-tx-ghost hover:text-white transition focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none">
                            <ExternalLink size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-white/10 mb-3" />
              <div className="text-tx-bright font-bold">No clients found</div>
              <div className="text-tx-dim text-xs mt-1">Try adjusting your filters or search term</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
          <span className="text-[11px] font-bold text-tx-dim">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} clients
          </span>
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 border border-white/[0.05] rounded-lg text-xs font-bold transition"
            >
              Prev
            </button>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 border border-white/[0.05] rounded-lg text-xs font-bold transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedLeads.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: '-50%' }} 
            animate={{ y: 0, opacity: 1, x: '-50%' }} 
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 bg-[#121625]/95 backdrop-blur-xl border border-electric/30 shadow-[0_10px_40px_rgba(59,130,246,0.3)] px-5 py-3 rounded-2xl"
          >
            <span className="text-[12px] font-black text-tx-bright bg-electric/20 px-2 py-0.5 rounded text-electric">
              {selectedLeads.length} selected
            </span>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-tx-ghost">Stage:</span>
            <select 
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-tx-bright outline-none focus:border-electric transition focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void"
              onChange={(e) => {
                if (e.target.value) handleBulkStageChange(e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="" disabled>Select Stage...</option>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>

            {isM && (
              <>
                <div className="h-4 w-px bg-white/20 mx-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-tx-ghost">Assign To:</span>
                <select
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-tx-bright outline-none focus:border-electric transition focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void"
                  onChange={(e) => {
                    if (e.target.value) handleBulkAssign(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select Rep...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </>
            )}

            <div className="h-4 w-px bg-white/20 mx-1" />
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-coral/10 hover:bg-coral/20 border border-coral/30 hover:border-coral rounded-xl text-xs font-black text-coral transition"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <button onClick={() => setSelectedLeads([])} className="text-[10px] font-bold text-tx-ghost hover:text-white transition">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Smart Filter Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <div className="fixed inset-0 z-50 bg-[#0a0f1c]/70 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-sm bg-gradient-to-br from-[#0d1525] to-[#0a0f1c] border border-white/[0.08] p-5 rounded-2xl shadow-2xl pointer-events-auto space-y-4" onClick={e => e.stopPropagation()}>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-tx-bright">Save Smart Filter</h4>
                  <p className="text-[10px] text-tx-ghost">Saves search, stage, and multi-sort criteria</p>
                </div>
                <input
                  type="text"
                  placeholder="Filter Name (e.g. High Value Deals)"
                  value={newFilterName}
                  onChange={e => setNewFilterName(e.target.value)}
                  className="w-full bg-void border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-tx-bright focus:border-electric/50 outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFilterName.trim()) {
                      saveSmartFilter(newFilterName.trim());
                      setNewFilterName('');
                      setShowSaveModal(false);
                      addToast('Smart Filter saved successfully', 'success');
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowSaveModal(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-tx-dim transition">
                    Cancel
                  </button>
                  <button 
                    disabled={!newFilterName.trim()}
                    onClick={() => {
                      saveSmartFilter(newFilterName.trim());
                      setNewFilterName('');
                      setShowSaveModal(false);
                      addToast('Smart Filter saved successfully', 'success');
                    }}
                    className="px-3 py-1.5 bg-electric hover:shadow-glow-electric text-void rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-30 transition"
                  >
                    Save Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Optimistic Concurrency Conflict Modal */}
      <ConflictResolutionModal conflict={conflict} onClose={() => setConflict(null)} />
    </div>
  );
}
