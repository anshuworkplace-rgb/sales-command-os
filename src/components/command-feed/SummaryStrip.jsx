import { AlertTriangle, Clock, Zap, Users, TrendingUp } from 'lucide-react';

export default function SummaryStrip({ stats }) {
  const chips = [
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: stats.overdue > 0 ? 'var(--priority-critical)' : 'var(--text-ghost)',
      urgent: stats.overdue > 0,
    },
    {
      label: 'SLA Breach',
      value: stats.sla,
      icon: Zap,
      color: stats.sla > 0 ? 'var(--accent-amber)' : 'var(--text-ghost)',
      urgent: stats.sla > 0,
    },
    {
      label: 'Today',
      value: stats.todayFollowUps,
      icon: Clock,
      color: 'var(--accent-blue)',
    },
    {
      label: 'Traders',
      value: stats.traders,
      icon: TrendingUp,
      color: 'var(--triage-trader-3)',
    },
    {
      label: 'Active',
      value: stats.total,
      icon: Users,
      color: 'var(--text-tertiary)',
    },
  ];

  return (
    <div className="summary-strip">
      {chips.map((chip, i) => {
        const Icon = chip.icon;
        return (
          <div
            key={i}
            className="summary-chip"
            style={chip.urgent ? {
              borderColor: chip.color + '40',
              background: chip.color + '08',
            } : undefined}
          >
            <Icon size={16} style={{ color: chip.color }} strokeWidth={chip.urgent ? 2.5 : 1.5} />
            <div>
              <div className="chip-number" style={{ color: chip.color }}>{chip.value}</div>
              <div className="chip-label">{chip.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
