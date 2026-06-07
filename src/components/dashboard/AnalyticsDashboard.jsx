import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Target, Zap, Clock, Trophy, DollarSign } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { formatCompact, formatPercent } from '../../utils/formatUtils';
import { STAGE_LABELS } from '../../utils/constants';
import { calculatePipelinePhysics } from '../../engines/PipelinePhysics';
import { forecastTargetHit } from '../../engines/PredictiveEngine';

const COLORS = ['#00e5ff', '#bf6bff', '#ffbe0a', '#00ffb2', '#ff4d6a', '#3d8bfd', '#ff2daa'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated/95 backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] text-txt-ghost font-mono mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCompact(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const { leads, activities } = useLeadStore();
  const { users, getCurrentUser } = useUserStore();
  const currentUser = getCurrentUser();
  const isGodMode = ['manager', 'admin'].includes(currentUser?.role);
  
  const sales = users.filter(u => u.role === 'sales');

  // Filter leads if not god mode
  const visibleLeads = isGodMode ? leads : leads.filter(l => l.assigned_to === currentUser?.id);

  // Pipeline Physics (The 0.1% Matrix)
  const physics = useMemo(() => calculatePipelinePhysics(visibleLeads), [visibleLeads]);

  // Conversion Funnel
  const funnel = useMemo(() => {
    const stages = ['new', 'contacted', 'interested', 'payment_done', 'upgrade', 'closed_won'];
    return stages.map(s => ({
      name: STAGE_LABELS[s] || s,
      count: visibleLeads.filter(l => l.status === s).length,
    }));
  }, [visibleLeads]);

  // Source Attribution
  const sources = useMemo(() => {
    const map = {};
    visibleLeads.forEach(l => {
      const src = l.source || 'manual';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [visibleLeads]);

  // Revenue by Rep (Only show in God Mode)
  const repRevenue = useMemo(() => {
    if (!isGodMode) return [];
    return sales.map(u => ({
      name: u.name?.split(' ')[0] || 'Unknown',
      revenue: leads.filter(l => l.assigned_to === u.id).reduce((s, l) => s + (Number(l.revenue) || 0), 0),
      leads: leads.filter(l => l.assigned_to === u.id).length,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [leads, sales, isGodMode]);

  // Daily Activity (last 14 days)
  const dailyActivity = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLeads = visibleLeads.filter(l => l.created_at?.startsWith(dateStr));
      const dayRevenue = dayLeads.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
      days.push({
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        leads: dayLeads.length,
        revenue: dayRevenue,
      });
    }
    return days;
  }, [visibleLeads]);

  const totalRev = visibleLeads.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
  const totalLeads = visibleLeads.length;

  // Forecasting
  const forecast = useMemo(() => {
    let currentTarget = 0;
    if (isGodMode) {
      currentTarget = users.filter(u => u.role === 'sales').reduce((sum, u) => sum + Number(u.monthly_target || 0), 0);
    } else {
      currentTarget = Number(currentUser?.monthly_target || 150000);
    }
    
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.max(1, (endOfMonth - now) / (1000 * 60 * 60 * 24));
    
    return forecastTargetHit(totalRev, physics.velocity, currentTarget, daysLeft);
  }, [totalRev, physics.velocity, users, currentUser, isGodMode]);

  return (
    <div className="space-y-5">
      {/* Target Forecast Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`glass-3d p-4 border rounded-2xl flex items-center justify-between ${forecast.willHit ? 'border-mint/20 bg-mint/[0.02]' : 'border-amber/20 bg-amber/[0.02]'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[18px] ${forecast.willHit ? 'bg-mint/10 text-mint' : 'bg-amber/10 text-amber'}`}>
            {forecast.confidence}%
          </div>
          <div>
            <h4 className="text-[14px] font-black font-display text-txt-glow">AI Target Forecast</h4>
            <p className="text-[11px] text-txt-dim">Projected Month End: <span className="text-txt-bright font-mono">{formatCompact(forecast.projected)}</span></p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[12px] font-bold ${forecast.willHit ? 'text-mint' : 'text-amber'}`}>
            {forecast.willHit ? 'ON TRACK TO CRUSH QUOTA' : 'RISK OF MISSING TARGET'}
          </div>
        </div>
      </motion.div>

      {/* The 0.1% Physics Matrix Row */}
      <h3 className="text-[14px] font-black font-display text-txt-glow flex items-center gap-2 mt-2">
        <Zap size={16} className="text-cyan" /> 0.1% Physics Matrix
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline Velocity', val: `${formatCompact(physics.velocity)}/day`, icon: Zap, neon: 'neon-amber' },
          { label: 'Avg Time to Touch', val: `${Math.round(physics.avgSlaMinutes)} mins`, icon: Clock, neon: physics.avgSlaMinutes > 15 ? 'neon-rose' : 'neon-mint' },
          { label: 'True Win Rate', val: formatPercent(physics.winRate * 100, 1), icon: Trophy, neon: 'neon-cyan' },
          { label: 'Average ACV', val: formatCompact(physics.acv), icon: DollarSign, neon: 'neon-mint' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass-3d p-4 border border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={s.neon} />
                <span className="text-[9px] font-bold text-txt-ghost uppercase tracking-wider">{s.label}</span>
              </div>
              <div className={`text-[24px] md:text-[28px] font-black font-display tabular-nums ${s.neon}`}>{s.val}</div>
            </motion.div>
          );
        })}
      </div>

      {/* SLA Ticker */}
      {physics.slaViolations > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="bg-rose/10 border border-rose/20 rounded-xl p-3 flex items-center gap-3 overflow-hidden whitespace-nowrap relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-void to-transparent z-10 flex items-center pl-3">
              <div className="w-2 h-2 rounded-full bg-rose pulse-glow" />
            </div>
            <div className="animate-[ticker_20s_linear_infinite] flex items-center gap-8 pl-8">
              <span className="text-[11px] font-black font-mono text-rose uppercase tracking-widest shrink-0">SLA VIOLATIONS DETECTED:</span>
              {physics.violatingLeads.map(l => (
                <span key={l.id} className="text-[11px] font-bold text-rose/80">
                  {l.name} ({Math.round((new Date() - new Date(l.created_at)) / 60000)}m ago)
                </span>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-void to-transparent z-10" />
          </div>
        </motion.div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Over Time */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-3d p-5">
          <h3 className="text-[13px] font-black font-display text-txt-glow mb-4">Lead Acquisition (14d)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyActivity}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3d4663' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3d4663' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="leads" stroke="#00e5ff" fill="url(#gradCyan)" strokeWidth={2} name="Leads" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Conversion Funnel */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-3d p-5">
          <h3 className="text-[13px] font-black font-display text-txt-glow mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#3d4663' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#7b87a8' }} axisLine={false} tickLine={false} width={85} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Attribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-3d p-5">
          <h3 className="text-[13px] font-black font-display text-txt-glow mb-4">Source Attribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={sources} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" stroke="none">
                  {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sources.slice(0, 5).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] text-txt-dim flex-1 capitalize">{s.name.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] font-mono font-bold text-txt-bright">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Rep Performance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-3d p-5">
          <h3 className="text-[13px] font-black font-display text-txt-glow mb-4">Revenue by Rep</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={repRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7b87a8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3d4663' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                {repRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
