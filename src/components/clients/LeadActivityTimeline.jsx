import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  GitCompare, 
  PlusSquare, 
  CheckCircle2, 
  FileText, 
  CreditCard, 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const ACTIVITY_CONFIG = {
  lead_created: {
    icon: UserPlus,
    bgClass: 'bg-electric/10 border-electric/30 text-electric',
    iconColor: 'text-electric',
    label: 'Lead Created'
  },
  status_change: {
    icon: GitCompare,
    bgClass: 'bg-gold/10 border-gold/35 text-gold',
    iconColor: 'text-gold',
    label: 'Stage Updated'
  },
  task_created: {
    icon: PlusSquare,
    bgClass: 'bg-violet/10 border-violet/30 text-violet',
    iconColor: 'text-violet',
    label: 'Task Created'
  },
  task_completed: {
    icon: CheckCircle2,
    bgClass: 'bg-mint/10 border-mint/30 text-mint',
    iconColor: 'text-mint',
    label: 'Task Completed'
  },
  note_added: {
    icon: FileText,
    bgClass: 'bg-sky/10 border-sky/30 text-sky',
    iconColor: 'text-sky',
    label: 'Note Added'
  },
  payment: {
    icon: CreditCard,
    bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    iconColor: 'text-emerald-400',
    label: 'Payment Logged'
  },
  deal_created: {
    icon: Briefcase,
    bgClass: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    iconColor: 'text-pink-400',
    label: 'Deal Opened'
  },
  deal_stage_change: {
    icon: TrendingUp,
    bgClass: 'bg-rose-500/10 border-rose-500/35 text-rose-400',
    iconColor: 'text-rose-400',
    label: 'Deal Stage Changed'
  },
  follow_up_scheduled: {
    icon: Calendar,
    bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    iconColor: 'text-amber-400',
    label: 'Follow-up Scheduled'
  }
};

const DEFAULT_CONFIG = {
  icon: Clock,
  bgClass: 'bg-white/5 border-white/10 text-tx-ghost',
  iconColor: 'text-tx-ghost',
  label: 'Event Logged'
};

export default function LeadActivityTimeline({ activities = [] }) {
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [activities]);

  if (sortedActivities.length === 0) {
    return (
      <div className="text-center py-8 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
        <Clock size={24} className="mx-auto text-white/10 mb-2" />
        <p className="text-xs text-tx-ghost">No timeline events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative pl-1">
      {/* Vertical line through timeline */}
      <div className="absolute left-5 top-2 bottom-2 w-px bg-white/[0.04] pointer-events-none" />

      <AnimatePresence initial={false}>
        {sortedActivities.map((act, idx) => {
          const config = ACTIVITY_CONFIG[act.type] || DEFAULT_CONFIG;
          const IconComponent = config.icon;

          return (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(idx * 0.04, 0.4) }}
              className="flex gap-4 group py-2 relative"
            >
              {/* Icon bullet */}
              <div className="flex flex-col items-center z-10 flex-shrink-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-glow ${config.bgClass}`}>
                  <IconComponent size={14} />
                </div>
              </div>

              {/* Event card details */}
              <div className="flex-1 bg-white/[0.01] border border-white/[0.03] group-hover:bg-white/[0.02] group-hover:border-white/[0.05] p-3 rounded-xl transition duration-300 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${config.iconColor}`}>
                    {config.label}
                  </span>
                  <span className="text-[9px] font-mono text-tx-ghost whitespace-nowrap">
                    {formatDate(act.created_at)}
                  </span>
                </div>
                
                <p className="text-xs text-tx-bright leading-relaxed break-words font-medium">
                  {act.description}
                </p>

                {/* Additional metadata badge preview */}
                {act.metadata && Object.keys(act.metadata).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(act.metadata).map(([key, val]) => {
                      if (typeof val === 'object' || !val) return null;
                      return (
                        <span key={key} className="inline-block px-1.5 py-0.2 bg-white/5 border border-white/5 rounded text-[8px] font-mono text-tx-ghost">
                          {key}: {String(val)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
