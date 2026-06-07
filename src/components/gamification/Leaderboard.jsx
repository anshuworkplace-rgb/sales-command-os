import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { formatCompact } from '../../utils/formatUtils';

export default function Leaderboard() {
  const { leads, activities } = useLeadStore();
  const { users } = useUserStore();

  const rankings = useMemo(() => {
    return users.filter(u => u.role === 'sales').map(user => {
      const userLeads = leads.filter(l => l.assignedTo === user.id);
      const revenue = userLeads.reduce((s, l) => s + (l.revenue || 0), 0);
      const followUps = activities.filter(a => a.userId === user.id && a.type === 'follow_up').length;
      const converted = userLeads.filter(l => ['PAYMENT_DONE', 'UPGRADE'].includes(l.status)).length;
      const streak = Math.floor(Math.random() * 7) + 1;
      return { ...user, revenue, followUps, converted, streak, score: revenue + followUps * 500 + converted * 2000 };
    }).sort((a, b) => b.score - a.score);
  }, [leads, activities, users]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-2xl bg-surface-card/60 border border-white/[0.04] p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-400/10 flex items-center justify-center">
          <Trophy size={16} className="text-accent-amber" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-txt-bright">Leaderboard</h3>
          <span className="text-[10px] text-txt-muted">Performance Rankings</span>
        </div>
      </div>

      <div className="space-y-2">
        {rankings.map((user, i) => (
          <motion.div key={user.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:bg-white/[0.03] ${
              i < 3 ? ['rank-1', 'rank-2', 'rank-3'][i] : 'border-white/[0.03]'
            }`}>
            
            {/* Rank */}
            <span className="text-[14px] w-5 text-center">{i < 3 ? medals[i] : <span className="text-txt-muted font-mono font-bold text-[12px]">#{i + 1}</span>}</span>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${user.color}25, ${user.color}08)`, color: user.color, border: `1px solid ${user.color}20` }}>
              {user.avatar}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-txt-bright truncate">{user.name}</div>
              <div className="text-[10px] text-txt-muted flex items-center gap-2">
                <span className="text-accent-emerald font-mono font-bold">{formatCompact(user.revenue)}</span>
                <span>·</span>
                <span>{user.followUps} FU</span>
                <span>·</span>
                <span>{user.converted} won</span>
              </div>
            </div>

            {/* Streak */}
            {user.streak >= 3 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-amber/10 border border-accent-amber/15">
                <Flame size={11} className="text-accent-amber" />
                <span className="text-[10px] font-mono font-bold text-accent-amber">{user.streak}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
