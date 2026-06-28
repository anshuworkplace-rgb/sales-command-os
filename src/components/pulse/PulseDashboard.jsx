import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Target, IndianRupee, Phone, Zap, Award } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { STAGE_LABELS, PIPELINE_STAGES, STAGE_COLORS } from '../../utils/constants';
import { formatCompact } from '../../utils/formatUtils';
import { calculateDRR, requiredDRR, getMonthProgress } from '../../engines/salesIntelligence';
import { classifyLead, TRIAGE, TRIAGE_META } from '../../engines/aiDecisionEngine';

const PremiumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(8,12,24,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '8px 12px',
      fontSize: '11px',
    }}>
      <p className="text-ghost mono text-[9px] uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-dim flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-bright mono">
            {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function PulseDashboard() {
  const { leads } = useLeadStore();
  const { users, getCurrentUser, getRepMonthlyTarget, monthlyTargets } = useUserStore();
  const { viewFilter, selectedMonth } = useUIStore();
  const user = getCurrentUser();
  const isManager = ['manager', 'admin'].includes(user?.role);
  const reps = users.filter(u => u.role === 'sales');

  const [selYear, selMonth] = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return [parseInt(y, 10), parseInt(m, 10) - 1];
  }, [selectedMonth]);

  const stats = useMemo(() => {
    const myLeads = (isManager && viewFilter === 'all') ? leads : leads.filter(l => l.assigned_to === user?.id);
    const now = new Date();
    const active = myLeads.filter(l => !['lost'].includes(l.status));
    const converted = myLeads.filter(l => ['converted', 'deployed'].includes(l.status));
    const thisMonth = myLeads.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === selMonth && d.getFullYear() === selYear;
    });

    const totalRevenue = converted.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);
    const thisMonthRevenue = converted.filter(l => {
      const d = new Date(l.updated_at || l.created_at);
      return d.getMonth() === selMonth && d.getFullYear() === selYear;
    }).reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);

    const target = 150000; // Default monthly target
    const { workingDays, daysElapsed, daysRemaining } = getMonthProgress(selYear, selMonth);
    const drr = calculateDRR(thisMonthRevenue, daysElapsed);
    const reqDrr = requiredDRR(target, thisMonthRevenue, daysRemaining);

    // Triage breakdown
    const triageCounts = {};
    Object.keys(TRIAGE_META).forEach(k => { triageCounts[k] = 0; });
    active.forEach(l => {
      const t = classifyLead(l);
      triageCounts[t] = (triageCounts[t] || 0) + 1;
    });

    // Stage breakdown
    const stageCounts = {};
    PIPELINE_STAGES.forEach(s => { stageCounts[s] = 0; });
    active.forEach(l => {
      if (stageCounts[l.status] !== undefined) stageCounts[l.status]++;
    });

    // Conversion rate
    const total = thisMonth.length || 1;
    const convRate = Math.round((converted.filter(l => {
      const d = new Date(l.updated_at || l.created_at);
      return d.getMonth() === selMonth && d.getFullYear() === selYear;
    }).length / total) * 100);

    return {
      totalLeads: myLeads.length,
      activeLeads: active.length,
      convertedCount: converted.length,
      totalRevenue,
      thisMonthRevenue,
      target,
      drr,
      reqDrr,
      convRate,
      triageCounts,
      stageCounts,
      thisMonthNew: thisMonth.length,
    };
  }, [leads, user, isManager, viewFilter, selYear, selMonth]);

  // Chart data — stage funnel
  const funnelData = useMemo(() =>
    PIPELINE_STAGES.map(s => ({
      name: STAGE_LABELS[s]?.split(' ')[0] || s,
      count: stats.stageCounts[s] || 0,
      fill: STAGE_COLORS[s]?.color || '#6b7280',
    })),
    [stats.stageCounts]
  );

  // Triage breakdown chart data
  const triageData = useMemo(() =>
    Object.entries(stats.triageCounts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: TRIAGE_META[key]?.label || key,
        count,
        fill: TRIAGE_META[key]?.color || '#6b7280',
      })),
    [stats.triageCounts]
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* KPI Cards */}
      <div className="pulse-grid">
        <div className="pulse-card">
          <div className="pulse-value text-blue">₹{formatCompact(stats.thisMonthRevenue)}</div>
          <div className="pulse-label">This Month</div>
          <div className={`pulse-delta ${stats.thisMonthRevenue >= stats.target ? 'positive' : 'negative'}`}>
            {stats.thisMonthRevenue >= stats.target ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.round((stats.thisMonthRevenue / stats.target) * 100)}% of ₹{formatCompact(stats.target)}
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-value text-emerald">{stats.convertedCount}</div>
          <div className="pulse-label">Converted</div>
          <div className="pulse-delta positive">
            <TrendingUp size={12} /> {stats.convRate}% conversion
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-value" style={{ color: 'var(--text-primary)' }}>{stats.activeLeads}</div>
          <div className="pulse-label">Active Pipeline</div>
          <div className="pulse-delta" style={{ color: 'var(--text-tertiary)' }}>
            {stats.thisMonthNew} new this month
          </div>
        </div>

        <div className="pulse-card">
          <div className="pulse-value mono" style={{
            color: stats.drr >= stats.reqDrr ? 'var(--accent-emerald)' : 'var(--accent-rose)',
          }}>
            ₹{formatCompact(stats.drr)}
          </div>
          <div className="pulse-label">Daily Run Rate</div>
          <div className={`pulse-delta ${stats.drr >= stats.reqDrr ? 'positive' : 'negative'}`}>
            {stats.drr >= stats.reqDrr ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            Need ₹{formatCompact(stats.reqDrr)}/day
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <div className="glass p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-ghost mb-4">Pipeline Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-ghost)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-ghost)' }} />
              <Tooltip content={<PremiumTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {funnelData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Triage Breakdown */}
        <div className="glass p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-ghost mb-4">Lead Triage</h3>
          <div className="space-y-3">
            {triageData.map(item => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-[100px] text-[12px] font-medium text-dim truncate">{item.name}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / (stats.activeLeads || 1)) * 100}%`,
                      background: item.fill,
                    }}
                  />
                </div>
                <span className="text-[12px] mono font-bold text-bright w-[30px] text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Leaderboard (Manager) */}
      {isManager && reps.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-ghost mb-4 flex items-center gap-2">
            <Award size={14} /> Team Leaderboard
          </h3>
          <div className="space-y-2">
            {reps.map((rep, i) => {
              const repLeads = leads.filter(l => l.assigned_to === rep.id);
              const repConverted = repLeads.filter(l => ['converted', 'deployed'].includes(l.status));
              const repRevenue = repConverted.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
              const repActive = repLeads.filter(l => !['lost', 'converted', 'deployed'].includes(l.status)).length;

              return (
                <div key={rep.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
                  <span className="text-[14px] font-bold mono text-ghost w-6">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg flex-center text-sm flex-shrink-0"
                    style={{ background: rep.color || 'var(--accent-blue)', color: 'white', fontWeight: 700 }}>
                    {rep.avatar || rep.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-bright truncate">{rep.name}</p>
                    <p className="text-[10px] text-ghost">{repActive} active · {repConverted.length} converted</p>
                  </div>
                  <span className="text-[14px] font-bold mono text-emerald">₹{formatCompact(repRevenue)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
