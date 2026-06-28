import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Phone, MapPin, IndianRupee, ChevronDown, Download, Upload } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { buildPriorityQueue, TRIAGE, TRIAGE_META, classifyLead } from '../../engines/aiDecisionEngine';
import { STAGE_LABELS, STAGE_ORDER } from '../../utils/constants';
import { formatPhoneDisplay } from '../../services/sheetsSync';

export default function PipelineView() {
  const { leads } = useLeadStore();
  const { getCurrentUser, users } = useUserStore();
  const { openLeadDetail, openImport, viewFilter, setViewFilter } = useUIStore();
  const user = getCurrentUser();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [triageFilter, setTriageFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority'); // priority | name | date | capital

  const filtered = useMemo(() => {
    let list = [...leads];

    // User filter
    if (!isManager || viewFilter !== 'all') {
      list = list.filter(l => l.assigned_to === user?.id);
    }

    // Stage filter
    if (stageFilter !== 'all') {
      list = list.filter(l => l.status === stageFilter);
    }

    // Triage filter
    if (triageFilter !== 'all') {
      list = list.filter(l => classifyLead(l) === triageFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q) ||
        (l.capital || '').toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'date':
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'capital':
        list.sort((a, b) => {
          const parseC = (s) => {
            if (!s) return 0;
            const t = s.toLowerCase();
            const m = t.match(/(\d+)/);
            return m ? parseInt(m[1]) : 0;
          };
          return parseC(b.capital) - parseC(a.capital);
        });
        break;
      case 'priority':
      default:
        // Use AI priority queue
        const queue = buildPriorityQueue(list);
        list = queue;
        break;
    }

    return list;
  }, [leads, user, isManager, viewFilter, search, stageFilter, triageFilter, sortBy]);

  const stageCounts = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-v2 pl-9 text-[13px]"
            placeholder="Search name, phone, city, feedback..."
          />
        </div>

        {/* Stage Filter */}
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="input-v2 text-[12px] w-auto"
          style={{ maxWidth: '160px' }}
        >
          <option value="all">All Stages ({leads.length})</option>
          {STAGE_ORDER.map(s => (
            <option key={s} value={s}>{STAGE_LABELS[s]} ({stageCounts[s] || 0})</option>
          ))}
        </select>

        {/* Triage Filter */}
        <select
          value={triageFilter}
          onChange={e => setTriageFilter(e.target.value)}
          className="input-v2 text-[12px] w-auto"
          style={{ maxWidth: '160px' }}
        >
          <option value="all">All Triage</option>
          {Object.entries(TRIAGE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.icon} {meta.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="input-v2 text-[12px] w-auto"
          style={{ maxWidth: '140px' }}
        >
          <option value="priority">Sort: AI Priority</option>
          <option value="name">Sort: Name</option>
          <option value="date">Sort: Newest</option>
          <option value="capital">Sort: Capital</option>
        </select>

        {/* Import */}
        <button onClick={openImport} className="action-btn text-[11px]">
          <Upload size={14} /> Import
        </button>

        {/* User filter (manager) */}
        {isManager && (
          <select
            value={viewFilter}
            onChange={e => setViewFilter(e.target.value)}
            className="input-v2 text-[12px] w-auto"
            style={{ maxWidth: '150px' }}
          >
            <option value="all">All Reps</option>
            {users.filter(u => u.role === 'sales').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Count */}
      <p className="text-[11px] text-ghost mono">{filtered.length} leads</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="pipeline-table">
          <thead>
            <tr>
              <th style={{ width: '4px' }}></th>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Capital</th>
              <th>Stage</th>
              <th>Triage</th>
              <th>Follow-Up</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-ghost">
                  No leads match your filters
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const triage = lead._ai?.triage || classifyLead(lead);
                const triageMeta = TRIAGE_META[triage];
                const isOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();

                return (
                  <tr
                    key={lead.id}
                    onClick={() => openLeadDetail(lead.id)}
                    className="cursor-pointer"
                  >
                    {/* Triage color indicator */}
                    <td style={{ padding: 0 }}>
                      <div style={{
                        width: '3px',
                        height: '100%',
                        minHeight: '36px',
                        background: triageMeta?.color || 'transparent',
                        borderRadius: '2px',
                      }} />
                    </td>

                    <td>
                      <span className="text-bright font-semibold text-[13px]">{lead.name || '—'}</span>
                    </td>

                    <td>
                      <a
                        href={`tel:+91${lead.phone?.replace(/[^\d]/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="mono text-[12px] text-blue hover:underline flex items-center gap-1"
                      >
                        <Phone size={11} />
                        {formatPhoneDisplay(lead.phone)}
                      </a>
                    </td>

                    <td className="text-dim text-[12px]">{lead.city || '—'}</td>

                    <td className="text-muted text-[12px] font-medium mono">{lead.capital || '—'}</td>

                    <td>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-md"
                        style={{
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-tertiary)',
                        }}>
                        {STAGE_LABELS[lead.status] || lead.status}
                      </span>
                    </td>

                    <td>
                      <span className={`triage-badge ${triageMeta?.bgClass?.replace('triage-', '') || ''}`}
                        style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {triageMeta?.icon} {triageMeta?.label}
                      </span>
                    </td>

                    <td>
                      {lead.next_follow_up ? (
                        <span className={`text-[11px] mono font-medium ${isOverdue ? 'text-rose' : 'text-dim'}`}>
                          {new Date(lead.next_follow_up).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ghost">—</span>
                      )}
                    </td>

                    <td>
                      <span className="text-[11px] text-dim truncate block max-w-[180px]">
                        {lead.notes || lead.last_feedback || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
