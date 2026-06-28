import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Search, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { buildPriorityQueue, checkReminders } from '../../engines/aiDecisionEngine';

export default function AICommandBar() {
  const { leads } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const { openLeadDetail, toggleCommandPalette, activePage } = useUIStore();
  const user = getCurrentUser();
  const [isExpanded, setIsExpanded] = useState(false);

  const suggestion = useMemo(() => {
    if (!user || !leads.length) return null;

    const queue = buildPriorityQueue(leads, user.id);
    if (!queue.length) return null;

    const top = queue[0];
    return {
      lead: top,
      message: `${top._ai.nba.icon} ${top._ai.nba.label}`,
      leadName: top.name || top.phone || 'Lead',
      score: top._ai.priorityScore,
    };
  }, [leads, user]);

  const reminders = useMemo(() => {
    if (!user) return [];
    return checkReminders(leads, user.id);
  }, [leads, user]);

  const overdueCount = reminders.filter(r => r.type === 'overdue').length;
  const slaCount = reminders.filter(r => r.type === 'sla').length;

  if (!user) return null;

  return (
    <>
      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-[54px] left-0 right-0 z-[59] p-4 lg:pl-[244px]"
            style={{ background: 'rgba(5,8,16,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="max-w-3xl mx-auto space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-2">
                Pending Reminders ({reminders.length})
              </h4>
              {reminders.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                  onClick={() => { openLeadDetail(r.lead.id); setIsExpanded(false); }}
                >
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.severity === 'critical' ? 'bg-rose/10 text-rose border border-rose/20' : 'bg-amber/10 text-amber border border-amber/20'}`}>
                    {r.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-bright truncate">{r.title}</p>
                    <p className="text-[10px] text-ghost truncate">{r.body}</p>
                  </div>
                  <span className="text-[10px] text-ghost">{r.action?.label}</span>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-[12px] text-ghost text-center py-4">✅ No pending reminders</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Bar */}
      <div className="ai-command-bar" style={{ marginLeft: activePage !== 'command' ? undefined : undefined }}>
        {/* AI Avatar */}
        <div className="ai-avatar" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
          <Bot size={16} className="text-white" />
        </div>

        {/* AI Message */}
        {suggestion ? (
          <div
            className="ai-message cursor-pointer flex-1 min-w-0"
            onClick={() => openLeadDetail(suggestion.lead.id)}
          >
            <strong>{suggestion.leadName}</strong> — {suggestion.message}
          </div>
        ) : (
          <div className="ai-message flex-1">
            <span className="text-ghost">All clear! No urgent actions.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {suggestion && (
            <button
              onClick={() => openLeadDetail(suggestion.lead.id)}
              className="action-btn primary text-[11px]"
            >
              → Open
            </button>
          )}

          {/* Overdue Badge */}
          {overdueCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--priority-critical)',
              }}
            >
              <AlertTriangle size={12} />
              {overdueCount}
            </button>
          )}

          {/* SLA Badge */}
          {slaCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: 'var(--accent-amber)',
              }}
            >
              <Clock size={12} />
              {slaCount}
            </button>
          )}

          {/* Search */}
          <button
            onClick={toggleCommandPalette}
            className="p-2 rounded-lg transition-colors hover:bg-white/[0.04]"
          >
            <Search size={16} className="text-ghost" />
          </button>

          {/* Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
          >
            <ChevronUp
              size={14}
              className="text-ghost transition-transform"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>
        </div>
      </div>
    </>
  );
}
