import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Zap, Filter, RefreshCw } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { buildPriorityQueue, TRIAGE, TRIAGE_META } from '../../engines/aiDecisionEngine';
import LeadCard from './LeadCard';
import SummaryStrip from './SummaryStrip';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

export default function CommandFeed() {
  const { leads } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const { openLeadDetail, viewFilter } = useUIStore();
  const user = getCurrentUser();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const [triageFilter, setTriageFilter] = useState('all');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const queue = useMemo(() => {
    const userId = (isManager && viewFilter === 'all') ? null : user?.id;
    return buildPriorityQueue(leads, userId);
  }, [leads, user, isManager, viewFilter]);

  const filteredQueue = useMemo(() => {
    let q = queue;

    // Filter by triage classification
    if (triageFilter !== 'all') {
      q = q.filter(l => l._ai.triage === triageFilter);
    }

    // Filter overdue only
    if (showOnlyOverdue) {
      q = q.filter(l => l._ai.nba.isOverdue);
    }

    // Exclude not_interested and paid from default feed
    if (triageFilter === 'all') {
      q = q.filter(l => l._ai.triage !== TRIAGE.NOT_INTERESTED && l._ai.triage !== TRIAGE.PAID_CLIENT);
    }

    return q;
  }, [queue, triageFilter, showOnlyOverdue]);

  const stats = useMemo(() => {
    const now = new Date();
    const all = queue;
    return {
      total: all.length,
      overdue: all.filter(l => l.next_follow_up && new Date(l.next_follow_up) < now && !['lost', 'converted', 'deployed'].includes(l.status)).length,
      sla: all.filter(l => ['fresh_enquiry', 'new'].includes(l.status) && !l.first_contact_at && ((now - new Date(l.enquiry_date || l.created_at)) / 60000 > 15)).length,
      todayFollowUps: all.filter(l => l.next_follow_up && new Date(l.next_follow_up).toDateString() === now.toDateString()).length,
      critical: all.filter(l => l._ai.priorityTag.label === 'CRITICAL').length,
      traders: all.filter(l => l._ai.triage === TRIAGE.REAL_TRADER).length,
    };
  }, [queue]);

  const TRIAGE_FILTERS = [
    { id: 'all', label: 'All Active', count: filteredQueue.length },
    { id: TRIAGE.REAL_TRADER, label: 'Traders', count: queue.filter(l => l._ai.triage === TRIAGE.REAL_TRADER).length, color: 'var(--triage-trader-3)' },
    { id: TRIAGE.NEEDS_QUALIFICATION, label: 'Qualify', count: queue.filter(l => l._ai.triage === TRIAGE.NEEDS_QUALIFICATION).length, color: 'var(--accent-amber)' },
    { id: TRIAGE.FRESH_UNTOUCHED, label: 'Fresh', count: queue.filter(l => l._ai.triage === TRIAGE.FRESH_UNTOUCHED).length, color: 'var(--triage-fresh)' },
    { id: TRIAGE.MEET_DONE, label: 'Meet Done', count: queue.filter(l => l._ai.triage === TRIAGE.MEET_DONE).length, color: 'var(--triage-meet)' },
    { id: TRIAGE.PAID_CLIENT, label: 'Paid', count: queue.filter(l => l._ai.triage === TRIAGE.PAID_CLIENT).length, color: 'var(--triage-paid-2)' },
    { id: TRIAGE.NOT_INTERESTED, label: 'Cold', count: queue.filter(l => l._ai.triage === TRIAGE.NOT_INTERESTED).length, color: 'var(--triage-cold-2)' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Summary Strip */}
      <SummaryStrip stats={stats} />

      {/* Triage Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {TRIAGE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTriageFilter(f.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: triageFilter === f.id ? (f.color ? `${f.color}15` : 'rgba(59,130,246,0.12)') : 'var(--bg-card)',
              border: `1px solid ${triageFilter === f.id ? (f.color || 'var(--accent-blue)') + '40' : 'var(--border-default)'}`,
              color: triageFilter === f.id ? (f.color || 'var(--accent-blue)') : 'var(--text-tertiary)',
            }}
          >
            <span>{f.label}</span>
            <span className="mono text-[10px] opacity-70">{f.count}</span>
          </button>
        ))}

        {/* Overdue toggle */}
        <button
          onClick={() => setShowOnlyOverdue(!showOnlyOverdue)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 ml-auto"
          style={{
            background: showOnlyOverdue ? 'rgba(239,68,68,0.12)' : 'var(--bg-card)',
            border: `1px solid ${showOnlyOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}`,
            color: showOnlyOverdue ? 'var(--priority-critical)' : 'var(--text-tertiary)',
          }}
        >
          <AlertTriangle size={12} />
          Overdue
        </button>
      </div>

      {/* Lead Cards Feed */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredQueue.length === 0 ? (
            <motion.div
              key="empty"
              {...fadeUp}
              className="flex-center flex-col gap-4 py-16"
            >
              <div className="w-16 h-16 rounded-2xl flex-center animate-breathe"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Zap size={24} className="text-emerald" />
              </div>
              <div className="text-center">
                <p className="text-bright font-semibold text-[15px]">All caught up!</p>
                <p className="text-dim text-[13px] mt-1">No urgent actions right now. Great work! 🎉</p>
              </div>
            </motion.div>
          ) : (
            filteredQueue.map((lead, index) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.04, 0.3) } }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <LeadCard
                  lead={lead}
                  onClick={() => openLeadDetail(lead.id)}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Feed Count */}
      {filteredQueue.length > 0 && (
        <p className="text-center text-[11px] text-ghost mono py-4">
          Showing {filteredQueue.length} of {queue.length} leads · Sorted by AI priority
        </p>
      )}
    </div>
  );
}
