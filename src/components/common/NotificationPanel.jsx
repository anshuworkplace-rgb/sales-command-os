import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { formatRelative } from '../../utils/dateUtils';

const NOTIF_ICONS = {
  overdue: { icon: AlertTriangle, color: 'text-rose', bg: 'bg-rose/10', border: 'border-rose/20' },
  cold: { icon: Clock, color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' },
  hot: { icon: TrendingUp, color: 'text-mint', bg: 'bg-mint/10', border: 'border-mint/20' },
  completed: { icon: CheckCircle2, color: 'text-cyan', bg: 'bg-cyan/10', border: 'border-cyan/20' },
};

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { leads } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const user = getCurrentUser();

  const notifications = useMemo(() => {
    const notifs = [];
    const now = new Date();
    const myLeads = ['manager', 'admin'].includes(user?.role) ? leads : leads.filter(l => l.assigned_to === user?.id);

    // Overdue follow-ups
    myLeads.forEach(l => {
      if (l.next_follow_up && new Date(l.next_follow_up) < now && !['closed_won', 'closed_lost'].includes(l.status)) {
        const hoursOver = Math.round((now - new Date(l.next_follow_up)) / 3600000);
        notifs.push({
          id: `overdue-${l.id}`,
          type: 'overdue',
          title: `${l.name} is ${hoursOver}h overdue`,
          description: `Follow-up was due ${formatRelative(l.next_follow_up)}`,
          timestamp: l.next_follow_up,
          leadId: l.id,
        });
      }
    });

    // Cold leads (48h+ inactive)
    myLeads.forEach(l => {
      if (!['closed_won', 'closed_lost'].includes(l.status)) {
        const hoursSince = (now - new Date(l.last_activity_at || l.created_at)) / 3600000;
        if (hoursSince > 48) {
          notifs.push({
            id: `cold-${l.id}`,
            type: 'cold',
            title: `${l.name} is going cold`,
            description: `No activity for ${Math.round(hoursSince)}h. Re-engage now.`,
            timestamp: l.last_activity_at || l.created_at,
            leadId: l.id,
          });
        }
      }
    });

    // Hot leads
    myLeads.forEach(l => {
      if ((l.lead_score || 0) >= 70 && !['closed_won', 'closed_lost'].includes(l.status)) {
        notifs.push({
          id: `hot-${l.id}`,
          type: 'hot',
          title: `${l.name} is HOT (${l.lead_score}/100)`,
          description: 'High conversion probability. Prioritize closing.',
          timestamp: l.updated_at || l.created_at,
          leadId: l.id,
        });
      }
    });

    return notifs.sort((a, b) => {
      const priority = { overdue: 0, cold: 1, hot: 2, completed: 3 };
      return (priority[a.type] || 99) - (priority[b.type] || 99);
    }).slice(0, 20);
  }, [leads, user]);

  const overdueCount = notifications.filter(n => n.type === 'overdue').length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-elevated/50 transition-colors text-txt-ghost hover:text-cyan"
      >
        <Bell size={18} />
        {overdueCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose text-[8px] font-black flex items-center justify-center text-white pulse-glow shadow-[0_0_8px_rgba(255,77,106,0.5)]">
            {overdueCount > 9 ? '9+' : overdueCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-elevated/95 backdrop-blur-2xl border border-white/[0.06] z-50 shadow-up overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                <span className="text-[12px] font-black font-display text-txt-glow">Notifications</span>
                <span className="text-[10px] font-mono text-txt-ghost">{notifications.length} alerts</span>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-txt-ghost text-[12px]">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-mint" />
                    All clear! No alerts.
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const conf = NOTIF_ICONS[n.type];
                    const Icon = conf.icon;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors`}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className={`w-7 h-7 rounded-lg ${conf.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon size={14} className={conf.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-txt-bright truncate">{n.title}</div>
                          <div className="text-[10px] text-txt-ghost leading-relaxed mt-0.5">{n.description}</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
