import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Target, Trophy, Zap, Clock, Users, 
  AlertTriangle, Flame, ChevronUp, ChevronDown, ArrowRight, 
  DollarSign, Sparkles, Star, ShieldAlert, Award, Calendar
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { formatCompact } from '../../utils/formatUtils';
import { STAGE_LABELS, PIPELINE_STAGES, STAGE_COLORS, STAGE_WIN_PROB } from '../../utils/constants';
import { calculateDRR, requiredDRR, getMonthProgress, getOfficeStatus, calculateRepScore } from '../../engines/salesIntelligence';
import RepPerformanceCard from './RepPerformanceCard';
import AnimatedCounter from '../common/AnimatedCounter';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const Confetti = () => {
  const [pieces, setPieces] = useState([]);
  
  useEffect(() => {
    const colors = ['#10b981', '#3b82f6', '#fbbf24', '#8b5cf6', '#f43f5e'];
    const newPieces = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      top: `-20px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${Math.random() * 0.5}s`,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="confetti-burst">
      {pieces.map(p => (
        <div 
          key={p.id} 
          className="confetti-piece"
          style={{ 
            left: p.left, 
            top: p.top, 
            backgroundColor: p.color, 
            animationDelay: p.delay 
          }} 
        />
      ))}
    </div>
  );
};

// Custom Interactive Glassmorphic Tooltip
const PremiumTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0b0f19]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs min-w-[120px] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan via-electric to-violet" />
      <p className="text-tx-ghost font-mono text-[9px] uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-tx-dim flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-extrabold text-tx-bright font-mono">
            {isCurrency ? `₹${formatCompact(p.value)}` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function HomeDashboard() {
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
  const { users, getCurrentUser, getRepMonthlyTarget, monthlyTargets, isLoading: usersLoading } = useUserStore();
  const { viewFilter, setActivePage, setStageFilter, setViewFilter, selectedMonth, setSelectedMonth } = useUIStore();
  const cur = getCurrentUser();
  const isM = ['manager', 'admin'].includes(cur?.role);
  const reps = users.filter(u => u.role === 'sales');

  const [selYear, selMonth] = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return [parseInt(y, 10), parseInt(m, 10) - 1];
  }, [selectedMonth]);

  const mp = getMonthProgress(selYear, selMonth);
  const office = getOfficeStatus();

  // State controls for dynamic upgraded sections
  const [funnelView, setFunnelView] = useState('count'); // 'count' | 'value'
  const [dailyRange, setDailyRange] = useState(14); // 7 | 14 | 30
  const [dailyMetric, setDailyMetric] = useState('leads'); // 'leads' | 'revenue'

  const vis = useMemo(() => {
    if (isM && viewFilter === 'all') return leads;
    if (isM && viewFilter !== 'all') return leads.filter(l => l.assigned_to === viewFilter);
    return leads.filter(l => l.assigned_to === cur?.id);
  }, [leads, isM, viewFilter, cur]);

  const m = useMemo(() => {
    // Filter vis leads for this month (created in this month OR won in this month)
    const visThisMonth = vis.filter(l => {
      const cDate = new Date(l.created_at);
      const createdThisMonth = cDate.getFullYear() === selYear && cDate.getMonth() === selMonth;
      
      let wonThisMonth = false;
      if (['deployed', 'converted', 'closed_won'].includes(l.status)) {
        const uDate = new Date(l.updated_at || l.created_at);
        wonThisMonth = uDate.getFullYear() === selYear && uDate.getMonth() === selMonth;
      }
      
      return createdThisMonth || wonThisMonth;
    });

    const rev = visThisMonth
      .filter(l => ['deployed', 'converted', 'closed_won'].includes(l.status))
      .reduce((s, l) => s + (Number(l.revenue) || 0), 0);

    const conv = visThisMonth.filter(l => {
      if (!['deployed', 'converted', 'closed_won'].includes(l.status)) return false;
      const uDate = new Date(l.updated_at || l.created_at);
      return uDate.getFullYear() === selYear && uDate.getMonth() === selMonth;
    }).length;

    const total = visThisMonth.filter(l => {
      const cDate = new Date(l.created_at);
      return cDate.getFullYear() === selYear && cDate.getMonth() === selMonth;
    }).length;

    const active = vis.filter(l => !['converted', 'deployed', 'closed_won', 'lost'].includes(l.status)).length;
    
    // Resolve target dynamically
    const target = isM && viewFilter === 'all'
      ? reps.reduce((s, u) => s + Number(getRepMonthlyTarget(u.id, selectedMonth)), 0)
      : Number(getRepMonthlyTarget(viewFilter !== 'all' ? viewFilter : (cur?.id), selectedMonth));

    const drr = calculateDRR(rev, mp.workingDaysElapsed);
    const reqDrr = requiredDRR(target, rev, mp.workingDaysRemaining);
    const projected = rev + drr * mp.workingDaysRemaining;
    const att = target > 0 ? Math.round((rev / target) * 100) : 0;
    const overdue = vis.filter(l => l.next_follow_up && new Date(l.next_follow_up) < new Date() && !['converted', 'deployed', 'closed_won', 'lost'].includes(l.status)).length;
    
    const wRev = vis.filter(l => !['converted', 'deployed', 'closed_won', 'lost'].includes(l.status))
      .reduce((s, l) => s + (Number(l.revenue) || 12999) * ((STAGE_WIN_PROB[l.status] || 10) / 100), 0);

    return { rev, conv, total, active, target, drr, reqDrr, projected, att, overdue, wRev, convRate: total > 0 ? ((conv / total) * 100).toFixed(1) : '0' };
  }, [vis, isM, viewFilter, cur, reps, mp, selYear, selMonth, selectedMonth, getRepMonthlyTarget]);

  // Upgraded funnel containing count as well as calculated pipeline worth
  const funnel = useMemo(() => PIPELINE_STAGES.map(s => {
    const stageLeads = vis.filter(l => l.status === s);
    const count = stageLeads.length;
    const value = stageLeads.reduce((sSum, l) => sSum + (Number(l.revenue) || 12999), 0);
    return {
      name: STAGE_LABELS[s],
      shortName: STAGE_LABELS[s]?.substring(0, 10),
      count,
      value,
      color: STAGE_COLORS[s]?.color || '#60a5fa',
    };
  }), [vis]);

  // Daily Cohorts with Range Selection
  const daily = useMemo(() => {
    const days = [];
    for (let i = dailyRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dl = vis.filter(l => l.created_at?.startsWith(ds));
      days.push({
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        leads: dl.length,
        revenue: dl.reduce((s, l) => s + (Number(l.revenue) || 0), 0)
      });
    }
    return days;
  }, [vis, dailyRange]);

  const board = useMemo(() => {
    return reps.map(u => {
      const target = getRepMonthlyTarget(u.id, selectedMonth);
      const s = calculateRepScore(u, leads, target, selYear, selMonth);
      return { ...u, ...s, rank: 0 };
    }).sort((a, b) => b.revenue - a.revenue).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [reps, leads, selectedMonth, selYear, selMonth, getRepMonthlyTarget]);

  // Attainment gauges styling variables
  const pct = m.att;
  const ringColor = pct >= 100 ? '#10b981' : pct >= 66 ? '#06b6d4' : pct >= 33 ? '#f59e0b' : '#ef4444';
  const ringCirc = 2 * Math.PI * 54;

  // Pace-Ometer Physics needle rotation
  const drrPace = m.reqDrr > 0 ? (m.drr / m.reqDrr) : 0;
  const needleRotation = Math.max(-90, Math.min(90, (drrPace - 1) * 90));

  // Weighted Pipeline Coverage Calculations
  const gap = Math.max(0, m.target - m.rev);
  const pipelineCoverage = gap > 0 ? (m.wRev / gap) : 0;

  // Streak/ podium reps destructuring
  const topReps = useMemo(() => board.slice(0, 3), [board]);
  const otherReps = useMemo(() => board.slice(3), [board]);

  // Determine whose performance to show in the hero card
  const heroUser = useMemo(() => {
    if (!isM) return cur;
    if (viewFilter !== 'all') return users.find(u => u.id === viewFilter) || cur;
    return null; // 'all' means team view
  }, [isM, viewFilter, cur, users]);

  const heroMetrics = useMemo(() => {
    if (!heroUser) return null;
    const target = getRepMonthlyTarget(heroUser.id, selectedMonth);
    return calculateRepScore(heroUser, leads, target, selYear, selMonth);
  }, [heroUser, leads, selectedMonth, selYear, selMonth, getRepMonthlyTarget]);

  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    for (let i = 0; i < 6; i++) {
      const d = new Date(year, month - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      list.push({ val, label });
    }
    return list;
  }, []);

  if (isLoading || usersLoading || leads.length === 0) {
    return (
      <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Selector skeleton */}
        <div className="h-14 bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
        {/* Header card skeleton */}
        <div className="h-24 bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Hero Control Deck Skeleton (spans 3 columns) */}
          <div className="lg:col-span-3 h-[320px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          {/* KPI Cards Skeleton (spans 2 columns) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 h-fit">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[152px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        {/* Charts row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[270px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
          <div className="h-[270px] bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* 🎊 Confetti on 100%+ Attainment */}
      {pct >= 100 && !shouldReduceMotion && <Confetti />}

      {/* 📅 Premium Month Selector Control Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0d1322]/80 border border-white/[0.05] p-3 rounded-2xl relative overflow-hidden backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-black text-tx-ghost">Report Month:</span>
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-tx-bright font-bold hover:bg-white/[0.05] transition-colors focus-within:ring-2 focus-within:ring-electric focus-within:ring-offset-2 focus-within:ring-offset-void">
            <Calendar size={13} className="text-electric" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-tx-bright outline-none font-bold cursor-pointer font-sans focus:ring-0 focus:outline-none"
            >
              {monthOptions.map(o => (
                <option key={o.val} value={o.val} className="bg-[#0b0f19] text-tx-bright">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isM && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-black text-tx-ghost">Select Rep:</span>
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-tx-bright font-bold outline-none cursor-pointer hover:bg-white/[0.05] transition-colors focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void"
            >
              <option value="all" className="bg-[#0b0f19]">👥 All Team</option>
              {reps.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0b0f19]">👤 {r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 🚀 10x Upgraded Header & Premium Status Panel */}
      {heroUser && heroMetrics ? (
        <RepPerformanceCard metrics={heroMetrics} userName={heroUser.name} isManager={isM} />
      ) : (
        <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-card/80 to-base/40 border border-white/[0.04] p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Glow behind */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric via-[#2563eb] to-[#7c3aed] flex items-center justify-center shadow-glow-electric">
              <Users size={22} className="text-tx-glow animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black font-heading text-tx-glow flex items-center gap-2">
                {office.isOfficeHours ? '☀️' : '🌙'} Team Command Center
              </h1>
              <div className="flex items-center gap-2.5 mt-1.5">
                <span className="text-[10px] text-tx-ghost font-black font-mono tracking-wider uppercase bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05] flex items-center gap-1">
                  <Calendar size={10} /> {mp.monthName}
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase ${office.isOfficeHours ? 'bg-mint/10 text-mint border border-mint/20 animate-pulse' : 'bg-coral/10 text-coral border border-coral/20'}`}>
                  {office.isOfficeHours ? `🟢 Live Active (${office.currentTime})` : '🔴 Shift Closed'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🚀 0.1% Bento-Grid Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Hero Control Deck (Top-Left, 60% width on Desktop -> lg:col-span-3) */}
        <motion.div 
          variants={fadeUp} 
          className="lg:col-span-3 glass-card-elevated p-6 relative overflow-hidden flex flex-col justify-between border-white/[0.06]"
        >
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-electric animate-pulse" />
              <span className="text-[10px] font-black text-tx-bright uppercase tracking-widest">Revenue Command Deck</span>
            </div>
            <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase font-mono ${drrPace >= 1.0 ? 'bg-mint/10 text-mint border border-mint/20' : 'bg-coral/10 text-coral border border-coral/20'}`}>
              {drrPace.toFixed(1)}x Pace
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            {/* Left half: Attainment Wheel & Details (7 cols) */}
            <div className="md:col-span-7 flex flex-col sm:flex-row items-center gap-5 justify-between">
              {/* Double ring display */}
              <div className="relative flex-shrink-0 group cursor-help">
                <svg width="120" height="120" className="transform -rotate-90 select-none">
                  {/* Outer Attainment Ring */}
                  <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke={ringColor} strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 - (Math.min(pct, 100) / 100) * (2 * Math.PI * 48)}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  
                  {/* Time Elapsed Ring */}
                  <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="5" />
                  <circle cx="60" cy="60" r="38" fill="none" stroke="#3b82f6" strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 - (Math.min(mp.monthPercent, 100) / 100) * (2 * Math.PI * 38)}
                    strokeOpacity="0.4" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-heading tracking-tight" style={{ color: ringColor }}>{pct}%</span>
                  <span className="text-[7.5px] text-tx-ghost font-bold uppercase tracking-widest mt-0.5">Quota Hit</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 w-full">
                <div>
                  <span className="text-[8.5px] text-tx-ghost font-black uppercase tracking-widest block">Revenue Closed</span>
                  <span className="text-xl font-black font-heading text-tx-bright">₹{m.rev.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04]">
                  <div>
                    <span className="text-[8px] text-tx-ghost font-bold uppercase tracking-wider block">Target</span>
                    <span className="text-[10px] font-black text-tx-dim font-mono">₹{formatCompact(m.target)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-tx-ghost font-bold uppercase tracking-wider block">Gap</span>
                    <span className="text-[10px] font-black text-coral font-mono">₹{formatCompact(gap)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-tx-ghost font-bold uppercase tracking-wider block">Coverage</span>
                    <span className={`text-[10px] font-black font-mono ${pipelineCoverage >= 2.5 ? 'text-mint' : pipelineCoverage >= 1.0 ? 'text-gold' : 'text-coral'}`}>
                      {pipelineCoverage.toFixed(1)}x
                    </span>
                  </div>
                </div>

                {/* Progress info */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-tx-ghost font-mono font-bold">
                    <span>Progress: {mp.monthPercent}%</span>
                    <span>{mp.workingDaysRemaining}d Left</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.03] border border-white/[0.04] overflow-hidden p-[1px]">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${ringColor}, ${ringColor}88)`, boxShadow: `0 0 8px ${ringColor}40` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right half: DRR Speedometer Gauge (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between h-full md:border-l border-white/[0.04] md:pl-5 pt-4 md:pt-0 border-t md:border-t-0">
              <div className="flex flex-col items-center justify-center">
                <svg viewBox="0 0 200 110" className="w-full max-w-[130px] overflow-visible">
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="65%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <filter id="needle-glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <path d="M 30,95 A 70,70 0 0,1 170,95" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 30,95 A 70,70 0 0,1 170,95" fill="none" stroke="url(#gauge-grad)" strokeWidth="12" strokeLinecap="round" />
                  <text x="25" y="108" fill="#3b4563" fontSize="8" fontWeight="bold" textAnchor="middle">0x</text>
                  <text x="100" y="18" fill="#6b7a9e" fontSize="9" fontWeight="black" textAnchor="middle">ON PACE</text>
                  <text x="175" y="108" fill="#3b4563" fontSize="8" fontWeight="bold" textAnchor="middle">2x+</text>

                  <g transform="translate(100, 95)">
                    <line x1="0" y1="0" x2="0" y2="-62" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round"
                      style={{ transform: `rotate(${needleRotation}deg)`, transformOrigin: '0px 0px', transition: shouldReduceMotion ? 'none' : 'transform 1.2s cubic-bezier(0.25, 0.8, 0.25, 1.4)' }}
                      filter="url(#needle-glow)" />
                    <circle cx="0" cy="0" r="7.5" fill="#8b5cf6" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                  </g>
                </svg>

                <div className="w-full space-y-1.5 font-mono text-[9.5px] mt-2">
                  <div className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                    <span className="text-[7.5px] text-tx-ghost font-bold uppercase tracking-wider">Current DRR</span>
                    <span className="font-black text-mint">₹{formatCompact(m.drr)}/d</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                    <span className="text-[7.5px] text-tx-ghost font-bold uppercase tracking-wider">Required DRR</span>
                    <span className="font-black text-tx-bright">₹{formatCompact(m.reqDrr)}/d</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic pace statement footer */}
          <div className={`mt-4 p-2 rounded-xl border flex items-center gap-1.5 relative z-10 ${m.drr >= m.reqDrr ? 'bg-mint/10 border-mint/20 text-mint' : 'bg-coral/10 border-coral/20 text-coral'}`}>
            {m.drr >= m.reqDrr ? <ChevronUp size={14} className="text-mint animate-bounce" /> : <ChevronDown size={14} className="text-coral animate-bounce" />}
            <span className="text-[9.5px] font-extrabold tracking-wide">
              {m.drr >= m.reqDrr 
                ? `ON TRACK: Pace exceeds target by ₹${formatCompact(m.drr - m.reqDrr)}/day! 🚀` 
                : `VELOCITY GAP: Add ₹${formatCompact(m.reqDrr - m.drr)}/day to close target gap! 💪`}
            </span>
          </div>
        </motion.div>

        {/* Right Column: KPI Cards Side Panel (Spans 2 columns of 5 -> 40% width on Desktop) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 h-fit">
          {[
            { label: 'Revenue Won', rawValue: m.rev, valueStr: formatCompact(m.rev), isCompact: true, prefix: '₹', color: 'text-mint', glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:border-mint/30 border-mint/10 bg-mint/5', bgGlow: 'from-mint/10', icon: '💰', sub: `${pct}% of target`, page: 'revenue' },
            { label: 'Conversions', rawValue: m.conv, valueStr: m.conv, isCompact: false, color: 'text-cyan', glow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan/30', bgGlow: 'from-cyan/5', icon: '🎯', sub: `${m.convRate}% win rate`, page: 'pipeline', filter: 'converted' },
            { label: 'Active Funnel', rawValue: m.active, valueStr: m.active, isCompact: false, color: 'text-electric', glow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.08)] hover:border-electric/30', bgGlow: 'from-electric/5', icon: '⚡', sub: `${m.total} total leads`, page: 'pipeline', filter: 'all' },
            { label: 'Overdue Tasks', rawValue: m.overdue, valueStr: m.overdue, isCompact: false, color: m.overdue > 0 ? 'text-coral' : 'text-mint', glow: m.overdue > 0 ? 'hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:border-coral/40 border-coral/10 bg-coral/5' : 'hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:border-mint/30', bgGlow: m.overdue > 0 ? 'from-coral/10' : 'from-mint/5', icon: m.overdue > 0 ? '🚨' : '✅', sub: m.overdue > 0 ? `${m.overdue} stalled` : 'Inbox cleared', page: 'today' },
          ].map(kpi => (
            <button
              key={kpi.label}
              onClick={() => {
                if (kpi.filter) setStageFilter(kpi.filter);
                setActivePage(kpi.page);
              }}
              className={`glass-card-elevated p-4 text-left w-full relative overflow-hidden transition-all duration-300 group motion-safe:hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none ${kpi.glow}`}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${kpi.bgGlow} to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[9px] uppercase tracking-widest font-black text-tx-ghost">{kpi.label}</span>
                <span className="text-base p-1 bg-white/[0.02] border border-white/[0.04] rounded-lg group-hover:scale-110 transition">{kpi.icon}</span>
              </div>
              <div className={`text-2xl font-black font-heading tracking-tight ${kpi.color} relative z-10`}>
                {kpi.isCompact ? (
                  <span>{kpi.prefix}{kpi.valueStr}</span>
                ) : (
                  <AnimatedCounter value={kpi.rawValue} prefix={kpi.prefix || ''} duration={1200} />
                )}
              </div>
              <div className="text-[9.5px] text-tx-ghost font-bold mt-1 flex items-center gap-1 relative z-10">
                <TrendingUp size={10} className="text-tx-ghost/60" /> {kpi.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 📊 Dynamic Upgraded Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Funnel chart with Stage vs Value toggle */}
        <motion.div variants={fadeUp} className="glass-card p-5 flex flex-col justify-between border-white/[0.05]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-electric animate-pulse" />
              <h3 className="text-[11.5px] font-black text-tx-bright uppercase tracking-widest">PIPELINE FUNNEL ANALYTICS</h3>
            </div>
            
            {/* View Toggle Count vs Pipeline Worth */}
            <div className="flex bg-white/[0.03] border border-white/[0.05] p-0.5 rounded-lg select-none">
              <button 
                onClick={() => setFunnelView('count')}
                className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition focus-visible:ring-1 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none ${funnelView === 'count' ? 'bg-electric text-void font-black shadow-md' : 'text-tx-ghost hover:text-tx-dim'}`}
              >
                Lead Counts
              </button>
              <button 
                onClick={() => setFunnelView('value')}
                className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition focus-visible:ring-1 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none ${funnelView === 'value' ? 'bg-electric text-void font-black shadow-md' : 'text-tx-ghost hover:text-tx-dim'}`}
              >
                Pipeline Value
              </button>
            </div>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 8, fill: '#3b4563', fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={val => funnelView === 'count' ? val : `₹${formatCompact(val)}`}
                />
                <YAxis 
                  dataKey="shortName" 
                  type="category" 
                  tick={{ fontSize: 8.5, fill: '#6b7a9e', fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={75} 
                />
                <Tooltip content={<PremiumTooltip isCurrency={funnelView === 'value'} />} cursor={{ fill: 'rgba(255,255,255,0.01)' }} />
                <Bar
                  dataKey={funnelView === 'count' ? 'count' : 'value'}
                  name={funnelView === 'count' ? 'Active Leads' : 'Expected Worth'}
                  radius={[0, 6, 6, 0]}
                  className="cursor-pointer"
                  onClick={(data) => {
                    const stageMap = {
                      'Fresh Enqu': 'fresh_enquiry',
                      'First Call': 'first_call',
                      'NPC / Retr': 'npc_retry',
                      'Discovery': 'discovery',
                      'Demo Sched': 'demo_scheduled',
                      'Demo Done': 'demo_done',
                      'Negotiatio': 'negotiation',
                      'Converted': 'converted',
                    };
                    const matchedKey = Object.keys(stageMap).find(k => data.name?.startsWith(k));
                    const stageValue = matchedKey ? stageMap[matchedKey] : 'all';
                    setStageFilter(stageValue);
                    setActivePage('pipeline');
                  }}
                >
                  {funnel.map((entry, i) => (
                    <Cell 
                      key={i} 
                      fill={entry.color} 
                      fillOpacity={0.7} 
                      stroke={entry.color} 
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cohort line chart with multi controls */}
        <motion.div variants={fadeUp} className="glass-card p-5 flex flex-col justify-between border-white/[0.05]">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-cyan animate-pulse" />
              <h3 className="text-[11.5px] font-black text-tx-bright uppercase tracking-widest">COHORT TREND TRACKER</h3>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Range Selector */}
              <div className="flex bg-white/[0.03] border border-white/[0.05] p-0.5 rounded-lg select-none">
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => setDailyRange(days)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition focus-visible:ring-1 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none ${dailyRange === days ? 'bg-cyan text-void font-black' : 'text-tx-ghost hover:text-tx-dim'}`}
                  >
                    {days}D
                  </button>
                ))}
              </div>

              {/* Metric Selector */}
              <div className="flex bg-white/[0.03] border border-white/[0.05] p-0.5 rounded-lg select-none">
                <button
                  onClick={() => setDailyMetric('leads')}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition focus-visible:ring-1 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none ${dailyMetric === 'leads' ? 'bg-cyan text-void font-black' : 'text-tx-ghost hover:text-tx-dim'}`}
                >
                  Leads
                </button>
                <button
                  onClick={() => setDailyMetric('revenue')}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition focus-visible:ring-1 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-void outline-none ${dailyMetric === 'revenue' ? 'bg-cyan text-void font-black' : 'text-tx-ghost hover:text-tx-dim'}`}
                >
                  Volume
                </button>
              </div>
            </div>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="glowColorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dailyMetric === 'leads' ? '#3b82f6' : '#10b981'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={dailyMetric === 'leads' ? '#3b82f6' : '#10b981'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#3b4563', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 8, fill: '#3b4563', fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                  tickFormatter={val => dailyMetric === 'leads' ? val : `₹${formatCompact(val)}`}
                />
                <Tooltip content={<PremiumTooltip isCurrency={dailyMetric === 'revenue'} />} />
                <Area 
                  type="monotone" 
                  dataKey={dailyMetric} 
                  stroke={dailyMetric === 'leads' ? '#3b82f6' : '#10b981'} 
                  fill="url(#glowColorGrad)" 
                  strokeWidth={2.5} 
                  name={dailyMetric === 'leads' ? 'Inward Leads' : 'Revenue closed'} 
                  dot={{ r: 3, strokeWidth: 1.5, stroke: dailyMetric === 'leads' ? '#3b82f6' : '#10b981', fill: '#06080f' }}
                  activeDot={{ r: 5, strokeWidth: 2, fill: dailyMetric === 'leads' ? '#3b82f6' : '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* 🥇 Gamified Shimmering Leaderboard Section */}
      <motion.div variants={fadeUp} className="glass-card p-6 border-white/[0.05] relative overflow-hidden">
        {/* Shimmering beam in background */}
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.015] to-transparent transform -skew-x-12 animate-shimmer" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-gold animate-bounce" />
            <h3 className="text-[12px] font-black text-tx-bright uppercase tracking-widest flex items-center gap-2">
              REVENUE CHAMPIONS PODIUM <Award size={13} className="text-gold" />
            </h3>
          </div>
          <button 
            onClick={() => setActivePage('leaderboard')} 
            className="text-[10px] font-black text-electric hover:underline uppercase tracking-wider bg-electric/5 border border-electric/15 px-3 py-1.5 rounded-xl motion-safe:hover:scale-[1.02] active:scale-[0.98] transition select-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none"
          >
            Full Roster →
          </button>
        </div>

        {/* 🏆 Top 3 Podiums Concept Layout */}
        {topReps.length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:gap-5 items-end max-w-2xl mx-auto pt-6 pb-4 mb-6 border-b border-white/[0.04] relative">
            
            {/* Rank 2 (Silver Card) */}
            {topReps[1] && (
              <div className="flex flex-col items-center w-full">
                <button 
                  onClick={() => isM && (setViewFilter(topReps[1].id), setActivePage('pipeline'))}
                  disabled={!isM}
                  className="w-full text-center bg-[#121625]/60 hover:bg-[#121625]/80 border border-white/[0.06] rounded-2xl p-3 cursor-pointer transition duration-300 relative group motion-safe:hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none"
                >
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#272e48] border border-white/[0.1] rounded-full flex items-center justify-center text-xs font-bold shadow-md">🥈</span>
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-xs font-extrabold border border-tx-dim/20 mb-2 relative" style={{ color: topReps[1].color || '#94a3b8' }}>
                    <div className="absolute inset-0 rounded-full blur-sm bg-tx-dim/15" />
                    <span className="relative z-10">{topReps[1].avatar || topReps[1].name?.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <h4 className="text-[11px] font-black text-tx-bright truncate">{topReps[1].name}</h4>
                  <p className="text-[9.5px] font-black font-mono text-tx-dim mt-1">₹{formatCompact(topReps[1].revenue)}</p>
                  <p className="text-[8.5px] text-tx-ghost mt-0.5">{topReps[1].attainment}% Target</p>
                </button>
                <div className="h-6 w-16 bg-white/[0.02] border-t border-x border-white/[0.05] rounded-t-lg mt-2 flex items-center justify-center"><span className="text-[9px] font-black text-tx-ghost font-mono">RANK 2</span></div>
              </div>
            )}

            {/* Rank 1 (Supreme Gold Card) */}
            {topReps[0] && (
              <div className="flex flex-col items-center relative -top-3 scale-[1.04] w-full">
                <button 
                  onClick={() => isM && (setViewFilter(topReps[0].id), setActivePage('pipeline'))}
                  disabled={!isM}
                  className="w-full text-center bg-gradient-to-b from-[#1b1509] to-[#0e111c] hover:from-[#211a0c] border border-gold/30 rounded-2xl p-4 cursor-pointer transition duration-300 relative group motion-safe:hover:-translate-y-1.5 shadow-[0_10px_35px_rgba(245,158,11,0.08)] focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none"
                >
                  <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 w-9 h-9 bg-gradient-to-tr from-gold to-yellow-300 border border-gold/50 rounded-full flex items-center justify-center text-sm font-bold shadow-lg animate-bounce select-none">👑</span>
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-sm font-black border border-gold/40 mb-2 relative" style={{ color: '#fbbf24' }}>
                    <div className="absolute inset-0 rounded-full blur-md bg-gold/25" />
                    <span className="relative z-10">{topReps[0].avatar || topReps[0].name?.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <h4 className="text-[12px] font-black text-gold truncate flex items-center justify-center gap-1">
                    {topReps[0].name}
                    {topReps[0].score >= 80 && <Flame size={11} className="text-orange-400 animate-pulse" />}
                  </h4>
                  <p className="text-sm font-black font-mono text-yellow-300 mt-1">₹{formatCompact(topReps[0].revenue)}</p>
                  <p className="text-[9px] font-black text-gold/80 mt-0.5">{topReps[0].attainment}% Target</p>
                </button>
                <div className="h-10 w-20 bg-gold/5 border-t border-x border-gold/20 rounded-t-lg mt-2 flex items-center justify-center"><span className="text-[9.5px] font-black text-gold font-mono">CHAMPION</span></div>
              </div>
            )}

            {/* Rank 3 (Bronze Card) */}
            {topReps[2] && (
              <div className="flex flex-col items-center w-full">
                <button 
                  onClick={() => isM && (setViewFilter(topReps[2].id), setActivePage('pipeline'))}
                  disabled={!isM}
                  className="w-full text-center bg-[#0d0e19]/60 hover:bg-[#0d0e19]/80 border border-white/[0.06] rounded-2xl p-3 cursor-pointer transition duration-300 relative group motion-safe:hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none"
                >
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#211a19] border border-white/[0.1] rounded-full flex items-center justify-center text-xs font-bold shadow-md">🥉</span>
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-xs font-extrabold border border-amber-700/20 mb-2 relative" style={{ color: '#d97706' }}>
                    <div className="absolute inset-0 rounded-full blur-sm bg-amber-700/15" />
                    <span className="relative z-10">{topReps[2].avatar || topReps[2].name?.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <h4 className="text-[11px] font-black text-tx-bright truncate">{topReps[2].name}</h4>
                  <p className="text-[9.5px] font-black font-mono text-tx-dim mt-1">₹{formatCompact(topReps[2].revenue)}</p>
                  <p className="text-[8.5px] text-tx-ghost mt-0.5">{topReps[2].attainment}% Target</p>
                </button>
                <div className="h-6 w-16 bg-white/[0.02] border-t border-x border-white/[0.05] rounded-t-lg mt-2 flex items-center justify-center"><span className="text-[9px] font-black text-tx-ghost font-mono">RANK 3</span></div>
              </div>
            )}

          </div>
        )}

        {/* Rest of sales squad list */}
        <div className="space-y-2.5 max-w-2xl mx-auto">
          {otherReps.map((rep, idx) => {
            const isMe = rep.id === cur?.id;
            return (
              <button
                key={rep.id}
                onClick={() => {
                  if (isM) {
                    setViewFilter(rep.id);
                    setActivePage('pipeline');
                  }
                }}
                disabled={!isM && !isMe}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-void outline-none ${
                  isMe
                    ? 'border-electric/30 bg-electric/[0.04] hover:bg-electric/[0.07] shadow-glow-electric/5'
                    : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]'
                } ${isM || isMe ? 'cursor-pointer motion-safe:hover:-translate-y-0.5' : 'cursor-default'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/5 text-tx-ghost flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">
                  {idx + 4}
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10.5px] font-black flex-shrink-0" style={{ background: `${rep.color}15`, color: rep.color }}>
                  {rep.avatar || rep.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-extrabold text-tx-bright truncate">{rep.name}</span>
                    {isMe && <span className="text-[8px] px-1.5 py-0.2 rounded bg-electric/10 text-electric font-black border border-electric/25 select-none font-mono">YOU</span>}
                    {rep.score >= 80 && <Flame size={11} className="text-orange-400 animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-tx-ghost font-bold mt-0.5">{rep.converted} Conv · DRR ₹{rep.drr.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-mint">₹{rep.revenue.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] font-mono font-bold text-tx-ghost">{rep.attainment}% of quota</div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
