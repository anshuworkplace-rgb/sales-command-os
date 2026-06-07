import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import { formatRelative } from '../../utils/dateUtils';

const DOT = { 
  lead_created: 'bg-cyan shadow-neon-cyan',
  status_change: 'bg-amber shadow-neon-amber', 
  task_completed: 'bg-mint shadow-neon-mint',
  task_created: 'bg-violet',
  note_added: 'bg-txt-ghost',
  payment: 'bg-mint shadow-neon-mint',
  deal_created: 'bg-cyan shadow-neon-cyan',
  deal_stage_change: 'bg-amber shadow-neon-amber',
  follow_up_scheduled: 'bg-violet'
};

export default function ActivityFeed({ userId }) {
  const { activities, leads, fetchAllActivities } = useLeadStore();
  const { openLeadDetail } = useUIStore();

  useEffect(() => {
    fetchAllActivities();
  }, [fetchAllActivities]);

  const feed = useMemo(() => {
    let f = userId ? activities.filter(a => a.performed_by === userId) : activities;
    return f
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)
      .map(a => ({ ...a, leadName: leads.find(l => l.id === a.lead_id)?.name || '?' }));
  }, [activities, leads, userId]);

  return (
    <div className="glass-3d p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo/20 to-violet/10 flex items-center justify-center">
          <Activity size={16} className="neon-violet" />
        </div>
        <div>
          <h3 className="text-[14px] font-black font-display text-txt-glow">Activity</h3>
          <span className="text-[9px] text-txt-ghost uppercase tracking-[0.2em] font-bold">Live Feed</span>
        </div>
      </div>
      <div className="space-y-0 max-h-[300px] overflow-y-auto pr-1">
        {feed.length === 0 && (
          <div className="text-center py-8 text-txt-ghost text-[12px]">No activity yet. Add your first lead!</div>
        )}
        {feed.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="flex gap-3 group cursor-pointer" onClick={() => item.lead_id && openLeadDetail(item.lead_id)}>
            <div className="flex flex-col items-center pt-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[item.type] || 'bg-txt-ghost'}`} />
              {i < feed.length - 1 && <div className="w-px flex-1 bg-white/[0.03] my-1" />}
            </div>
            <div className="flex-1 pb-3 min-w-0 px-2 py-1 rounded-lg group-hover:bg-white/[0.02] transition-colors">
              <span className="text-[11px] font-bold neon-cyan">{item.leadName}</span>
              <div className="text-[11px] text-txt-primary mt-0.5">{item.description}</div>
              <div className="text-[9px] text-txt-ghost mt-0.5 font-mono">{formatRelative(item.created_at)}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
