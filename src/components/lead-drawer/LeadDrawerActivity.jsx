import { Clock, MessageCircle, Phone, ArrowRight, FileText } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTIVITY_ICONS = {
  note_added: FileText,
  status_change: ArrowRight,
  lead_created: Phone,
  follow_up_scheduled: Clock,
  task_completed: MessageCircle,
};

const ACTIVITY_COLORS = {
  note_added: 'var(--accent-blue)',
  status_change: 'var(--accent-violet)',
  lead_created: 'var(--accent-emerald)',
  follow_up_scheduled: 'var(--accent-amber)',
  task_completed: 'var(--triage-trader-3)',
};

export default function LeadDrawerActivity({ lead, activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex-center flex-col gap-3 py-12">
        <Clock size={28} className="text-ghost" />
        <p className="text-[13px] text-dim">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost mb-3 flex items-center gap-2">
        <Clock size={13} /> Activity Timeline
      </h4>

      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-[15px] top-6 bottom-6 w-px"
          style={{ background: 'var(--border-subtle)' }}
        />

        {activities.map((activity, i) => {
          const Icon = ACTIVITY_ICONS[activity.type] || FileText;
          const color = ACTIVITY_COLORS[activity.type] || 'var(--text-ghost)';

          return (
            <div key={activity.id || i} className="flex gap-3 py-2.5 relative">
              {/* Icon dot */}
              <div
                className="w-[30px] h-[30px] rounded-lg flex-center flex-shrink-0 relative z-10"
                style={{
                  background: color + '15',
                  border: `1px solid ${color}30`,
                }}
              >
                <Icon size={13} style={{ color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted leading-relaxed">
                  {activity.description || activity.type?.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-ghost mono">{timeAgo(activity.created_at)}</span>
                  {activity.profiles?.name && (
                    <span className="text-[10px] text-ghost">by {activity.profiles.name}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
