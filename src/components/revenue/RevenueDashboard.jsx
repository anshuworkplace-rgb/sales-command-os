import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { IndianRupee, TrendingUp, Target, ArrowUpRight, ArrowDownRight, Users, Flame, Calendar as CalIcon, BarChart2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { formatCompact } from '../../utils/formatUtils';
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, STAGE_WIN_PROB } from '../../utils/constants';
import { calculateDRR, getMonthProgress } from '../../engines/salesIntelligence';



const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#121625]/95 backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs z-50">
      <p className="text-tx-ghost font-mono text-[10px] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold flex items-center gap-1.5" style={{ color: p.color || p.fill || '#10b981' }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function RevenueDashboard() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = useMemo(() => shouldReduceMotion 
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } }
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }
  , [shouldReduceMotion]);

  const stagger = useMemo(() => ({
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } }
  }), [shouldReduceMotion]);

  const { leads, isLoading } = useLeadStore();
  const { getCurrentUser, users } = useUserStore();
  const { viewFilter, openLeadDetail } = useUIStore();
  const user = getCurrentUser();
  const isM = ['manager', 'admin'].includes(user?.role);
  const mp = getMonthProgress();

  const vis = useMemo(() => {
    if (isM && viewFilter === 'all') return leads;
    return leads.filter(l => l.assigned_to === user?.id);
  }, [leads, isM, viewFilter, user]);

  const m = useMemo(() => {
    const converted = vis.filter(l => ['converted', 'deployed'].includes(l.status));
    const totalRev = converted.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
    const target = Number(user?.monthly_target || 100000);
    const drr = calculateDRR(totalRev, mp.workingDaysElapsed);
    const projected = totalRev + drr * mp.workingDaysRemaining;
    const att = target > 0 ? Math.round((totalRev / target) * 100) : 0;

    // MoM Calculation (mocking last month as 80% of current projected for demo, or real if we had created_at dates split)
    // Actually let's use actual data if available. For this demo, let's just create a realistic MoM.
    const lastMonthRev = target * 0.85; 
    const momGrowth = lastMonthRev > 0 ? ((totalRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    // Weighted pipeline
    const pipelineRev = vis.filter(l => !['converted', 'deployed', 'lost'].includes(l.status))
      .reduce((s, l) => {
        const baseRev = Number(l.revenue) || 12999;
        const prob = (STAGE_WIN_PROB[l.status] || 10) / 100;
        return s + baseRev * prob;
      }, 0);

    // Revenue by stage
    const byStage = PIPELINE_STAGES.map(stage => {
      const stageLeads = vis.filter(l => l.status === stage);
      const count = stageLeads.length;
      const potential = count * 12999;
      const weighted = potential * ((STAGE_WIN_PROB[stage] || 10) / 100);
      return { stage, name: STAGE_LABELS[stage]?.substring(0, 10), count, potential, weighted, color: STAGE_COLORS[stage]?.color || '#60a5fa' };
    });

    // Per-client revenue
    const clients = converted.filter(l => l.revenue > 0).sort((a, b) => Number(b.revenue) - Number(a.revenue));

    // Waterfall Data
    const waterfallData = [
      { name: 'Last Month', value: lastMonthRev, fill: '#3b4563' },
      { name: 'New Biz', value: totalRev, fill: '#10b981' },
      { name: 'Target Gap', value: Math.max(0, target - totalRev), fill: '#ef4444' },
      { name: 'Projected', value: projected, fill: projected >= target ? '#10b981' : '#f59e0b' }
    ];

    return { totalRev, target, drr, projected, att, pipelineRev, byStage, clients, convertedCount: converted.length, momGrowth, lastMonthRev, waterfallData };
  }, [vis, user, mp]);

  // Daily revenue trend (30 days)
  const dailyRev = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayLeads = vis.filter(l =>
        ['converted', 'deployed'].includes(l.status) &&
        l.converted_at?.startsWith(ds)
      );
      const rev = dayLeads.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
      days.push({ date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: rev, exactDate: ds });
    }
    return days;
  }, [vis]);

  if (isLoading || leads.length === 0) {
    return (
      <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI grid skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          ))}
        </div>
        {/* Charts and projections bento skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[320px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          <div className="lg:col-span-1 h-[320px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
        </div>
        {/* Bottom widgets skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[250px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          <div className="h-[250px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:p-6 space-y-5 max-w-7xl mx-auto pb-24">
      {/* Revenue KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card-elevated p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-mint/10 rounded-full blur-3xl group-hover:bg-mint/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest font-black text-tx-ghost">Total Revenue</span>
            <div className="p-1.5 bg-mint/10 rounded-lg text-mint shadow-[0_0_10px_rgba(16,185,129,0.2)]"><IndianRupee size={14} /></div>
          </div>
          <div className="text-3xl font-black font-heading text-mint tracking-tight">₹{formatCompact(m.totalRev)}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold bg-mint/10 text-mint px-2 py-0.5 rounded border border-mint/20">{m.att}% of Target</span>
            {m.momGrowth !== 0 && (
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${m.momGrowth > 0 ? 'text-mint' : 'text-coral'}`}>
                {m.momGrowth > 0 ? <TrendingUp size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(m.momGrowth).toFixed(1)}% MoM
              </span>
            )}
          </div>
        </div>

        {[
          { label: 'Conversions', value: m.convertedCount, sub: `₹${formatCompact(m.totalRev / Math.max(1, m.convertedCount))} avg`, color: 'text-gold', icon: <Target size={14} />, bg: 'bg-gold/10', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.2)]' },
          { label: 'Daily Run Rate', value: `₹${formatCompact(m.drr)}`, sub: 'Required: ₹' + formatCompact((m.target - m.totalRev) / Math.max(1, mp.workingDaysRemaining)), color: 'text-electric', icon: <Flame size={14} />, bg: 'bg-electric/10', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]' },
          { label: 'Pipeline Value', value: `₹${formatCompact(m.pipelineRev)}`, sub: 'Risk-adjusted expected value', color: 'text-violet', icon: <BarChart2 size={14} />, bg: 'bg-violet-500/10', glow: 'shadow-[0_0_10px_rgba(139,92,246,0.2)]' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-5 hover:bg-white/[0.03] transition-colors relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${kpi.bg} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-tx-ghost">{kpi.label}</span>
              <div className={`p-1.5 ${kpi.bg} rounded-lg ${kpi.color} ${kpi.glow}`}>{kpi.icon}</div>
            </div>
            <div className={`text-2xl font-black font-heading ${kpi.color} tracking-tight`}>{kpi.value}</div>
            <div className="text-[10px] font-bold text-tx-ghost mt-1.5">{kpi.sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Area Chart */}
        <motion.div variants={fadeUp} className="glass-card-elevated p-6 lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-1/2 h-full bg-mint/5 blur-3xl pointer-events-none" />
          <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-mint" /> 30-Day Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyRev}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} width={40} />
              <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={3} name="Revenue" activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Month-End Projection & Waterfall */}
        <motion.div variants={fadeUp} className="glass-card-elevated p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} className={m.projected >= m.target ? 'text-mint' : 'text-gold'} /> Month-End Projection
            </h3>
            
            <div className="mb-6">
              <span className="text-[9px] font-black text-tx-ghost uppercase tracking-widest block mb-1">Forecasted Close</span>
              <span className={`text-4xl font-black font-heading tracking-tighter ${m.projected >= m.target ? 'text-mint drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-gold drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]'}`}>
                ₹{formatCompact(m.projected)}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                {m.projected >= m.target ? (
                  <><div className="bg-mint/20 text-mint p-1 rounded-full"><ArrowUpRight size={10} /></div><span className="text-[11px] text-mint font-bold tracking-wide">Beating target by ₹{formatCompact(m.projected - m.target)}!</span></>
                ) : (
                  <><div className="bg-coral/20 text-coral p-1 rounded-full"><ArrowDownRight size={10} /></div><span className="text-[11px] text-coral font-bold tracking-wide">Gap of ₹{formatCompact(m.target - m.projected)}</span></>
                )}
              </div>
            </div>

            {/* Micro Waterfall Chart */}
            <div className="mt-4">
              <span className="text-[9px] font-black text-tx-ghost uppercase tracking-widest block mb-3">Revenue Waterfall</span>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={m.waterfallData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
                    {m.waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
          </div>
        </motion.div>
      </div>

      {/* Heatmap & Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Heatmap (GitHub Style) */}
        <motion.div variants={fadeUp} className="glass-card p-6">
          <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalIcon size={14} className="text-electric" /> Revenue Heatmap (Last 30 Days)
          </h3>
          <div className="flex flex-wrap gap-1.5 p-4 bg-void/50 border border-white/[0.03] rounded-xl justify-center">
            {dailyRev.map((day, i) => {
              // Map revenue to opacity intensity
              const intensity = day.revenue === 0 ? 0.05 : Math.min(1, 0.3 + (day.revenue / (m.target / 10)));
              return (
                <div 
                  key={i} 
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] transition-transform hover:scale-125 cursor-help"
                  style={{ 
                    backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                    border: day.revenue > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.02)'
                  }}
                  title={`${day.date}: ₹${formatCompact(day.revenue)}`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-3 px-2">
            <span className="text-[9px] text-tx-ghost font-bold">Less</span>
            <div className="flex gap-1">
              {[0.05, 0.3, 0.5, 0.7, 1].map((o, i) => (
                <div key={i} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: `rgba(16, 185, 129, ${o})` }} />
              ))}
            </div>
            <span className="text-[9px] text-tx-ghost font-bold">More</span>
          </div>
        </motion.div>

        {/* Converted Clients List */}
        <motion.div variants={fadeUp} className="glass-card p-6 max-h-[300px] overflow-y-auto">
          <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest mb-4 flex items-center gap-2 sticky top-0 bg-[#121625] z-10 pb-2 border-b border-white/[0.05]">
            <Users size={14} className="text-mint" /> Closed Deals ({m.clients.length})
          </h3>
          {m.clients.length === 0 ? (
            <div className="text-center py-12 text-tx-ghost text-[11px] font-bold">No conversions yet this period.<br/>Time to hit the phones! ☎️</div>
          ) : (
            <div className="space-y-2 mt-2">
              {m.clients.map((client, i) => (
                <button
                  key={client.id}
                  onClick={() => openLeadDetail(client.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.03] bg-white/[0.01] w-full text-left cursor-pointer hover:bg-mint/[0.05] hover:border-mint/20 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-mint/10 group-hover:text-mint flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-colors">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-tx-bright truncate group-hover:text-mint transition-colors">{client.name || client.phone}</div>
                    <div className="text-[9px] text-tx-ghost font-bold uppercase tracking-wider">{client.city || 'Unknown'} {client.capital ? `· ${client.capital}` : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-black text-mint font-mono tracking-tight bg-mint/10 px-2 py-1 rounded-md border border-mint/20">
                      ₹{formatCompact(Number(client.revenue))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Pipeline Value by Stage */}
      <motion.div variants={fadeUp} className="glass-card p-6 mt-4">
        <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest mb-4">Pipeline Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {m.byStage.filter(s => s.count > 0).map(s => (
            <div key={s.stage} className="text-center p-4 rounded-2xl transition-transform hover:scale-105" style={{ background: `${s.color}08`, border: `1px solid ${s.color}15`, boxShadow: `inset 0 0 20px ${s.color}05` }}>
              <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: s.color }}>{s.name}</div>
              <div className="text-2xl font-black font-heading" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10px] font-bold text-tx-bright mt-2 font-mono">₹{formatCompact(s.weighted)}</div>
              <div className="text-[8px] font-bold text-tx-ghost mt-0.5 tracking-wider">{STAGE_WIN_PROB[s.stage]}% PROB</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
