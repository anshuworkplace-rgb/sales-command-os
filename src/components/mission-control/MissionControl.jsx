import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Target,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Flame,
  Eye,
  BrainCircuit,
  Sparkles,
  CalendarCheck,
  Users,
  DollarSign,
} from 'lucide-react';
import { spring, stagger, slideUp } from '../../motion/index.js';

// ─── DEMO DATA ──────────────────────────────────────────────────────

const REVENUE_METRICS = [
  {
    label: 'Revenue',
    value: 2400000,
    prefix: '$',
    suffix: '',
    format: 'compact',
    trend: 12.4,
    trendDir: 'up',
    sparkline: [28, 35, 42, 38, 52, 48, 61, 58, 72, 68, 78, 85],
  },
  {
    label: 'Pipeline Value',
    value: 8700000,
    prefix: '$',
    suffix: '',
    format: 'compact',
    trend: 8.2,
    trendDir: 'up',
    sparkline: [40, 38, 45, 52, 48, 55, 62, 58, 65, 70, 75, 82],
  },
  {
    label: 'Win Rate',
    value: 34,
    prefix: '',
    suffix: '%',
    format: 'number',
    trend: 2.1,
    trendDir: 'up',
    sparkline: [22, 25, 24, 28, 30, 27, 31, 29, 33, 32, 34, 34],
  },
  {
    label: 'Avg Deal Size',
    value: 127000,
    prefix: '$',
    suffix: '',
    format: 'compact',
    trend: 3.7,
    trendDir: 'down',
    sparkline: [145, 138, 142, 135, 130, 133, 128, 131, 126, 129, 127, 127],
  },
];

const HOT_OPPORTUNITIES = [
  { id: 1, name: 'Enterprise Platform License', company: 'Acme Corp', value: 420000, aiScore: 92, stage: 'Negotiation', momentum: 'up' },
  { id: 2, name: 'Cloud Migration Suite', company: 'TechFlow Inc', value: 340000, aiScore: 87, stage: 'Proposal', momentum: 'up' },
  { id: 3, name: 'Data Analytics Package', company: 'NovaStar Labs', value: 285000, aiScore: 78, stage: 'Qualification', momentum: 'up' },
  { id: 4, name: 'Security Compliance Module', company: 'Quantum Dynamics', value: 195000, aiScore: 71, stage: 'Discovery', momentum: 'stable' },
  { id: 5, name: 'API Integration Gateway', company: 'PrimeScale', value: 160000, aiScore: 65, stage: 'Proposal', momentum: 'up' },
];

const RISK_ALERTS = [
  { id: 1, deal: 'DataWave Analytics', risk: 'Champion left the company — no internal sponsor remaining', severity: 'Critical', daysSilent: 14 },
  { id: 2, deal: 'CloudPeak Migration', risk: 'Budget review triggered by CFO — deal may slip to Q3', severity: 'High', daysSilent: 9 },
  { id: 3, deal: 'Meridian Systems', risk: 'Competitor pricing undercut by 30% — needs executive alignment', severity: 'High', daysSilent: 7 },
  { id: 4, deal: 'Apex Solutions', risk: 'No engagement after proposal sent — follow up urgently', severity: 'Medium', daysSilent: 11 },
];

const RECOMMENDATIONS = [
  {
    icon: Eye,
    title: 'Follow up with Acme Corp',
    description: 'They visited your pricing page 3 times this week and downloaded the ROI calculator. Strike while intent is high.',
    action: 'Send Proposal',
    accent: 'indigo',
  },
  {
    icon: Users,
    title: 'Multi-thread TechFlow deal',
    description: 'You\'re single-threaded with the VP. Loop in the CTO who was mentioned in the last call transcript.',
    action: 'View Contacts',
    accent: 'emerald',
  },
  {
    icon: CalendarCheck,
    title: 'Schedule QBR with NovaStar',
    description: 'They renewed last quarter. Usage is up 40%. Perfect timing to discuss expansion and upsell analytics.',
    action: 'Book Meeting',
    accent: 'amber',
  },
];

const FOCUS_TASKS = [
  { id: 1, text: 'Send revised proposal to Acme Corp', entity: 'Acme Corp', time: '15 min', done: false },
  { id: 2, text: 'Prep executive summary for TechFlow board review', entity: 'TechFlow Inc', time: '30 min', done: false },
  { id: 3, text: 'Call NovaStar to discuss Q3 expansion', entity: 'NovaStar Labs', time: '20 min', done: false },
  { id: 4, text: 'Review Quantum Dynamics security requirements', entity: 'Quantum Dynamics', time: '25 min', done: false },
  { id: 5, text: 'Update CRM notes for DataWave risk escalation', entity: 'DataWave', time: '10 min', done: true },
];

// ─── HELPERS ────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatValue(val, format, prefix = '', suffix = '') {
  let formatted;
  if (format === 'compact') {
    if (val >= 1_000_000) formatted = `${(val / 1_000_000).toFixed(1)}M`;
    else if (val >= 1_000) formatted = `${(val / 1_000).toFixed(0)}K`;
    else formatted = val.toString();
  } else {
    formatted = Math.round(val).toLocaleString();
  }
  return `${prefix}${formatted}${suffix}`;
}

// ─── ANIMATED NUMBER HOOK ───────────────────────────────────────────

function useAnimatedNumber(target, duration = 1800) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return current;
}

// ─── SPARKLINE ──────────────────────────────────────────────────────

function Sparkline({ data, color = '#6366f1', width = 120, height = 32 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── AI SCORE RING ──────────────────────────────────────────────────

function AiScoreRing({ score, size = 44 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white/90">{score}</span>
    </div>
  );
}

// ─── SECTION WRAPPER ────────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

function Section({ children, delay = 0, className = '' }) {
  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...spring.gentle, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── GLASS CARD ─────────────────────────────────────────────────────

function GlassCard({ children, className = '', hover = true, onClick }) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      transition={spring.snappy}
      onClick={onClick}
      className={`
        relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-shadow duration-300
        ${hover ? 'cursor-pointer hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(99,102,241,0.15)]' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

// ─── TYPEWRITER BRIEFING ────────────────────────────────────────────

function TypewriterBriefing({ text }) {
  const words = text.split(' ');
  return (
    <p className="text-base leading-relaxed text-white/50 max-w-3xl">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.04, duration: 0.3 }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

// ─── METRIC CARD ────────────────────────────────────────────────────

function MetricCard({ metric, index }) {
  const animatedValue = useAnimatedNumber(metric.value, 2000 + index * 200);
  const isUp = metric.trendDir === 'up';

  return (
    <GlassCard className="p-5 group overflow-hidden">
      {/* Subtle accent glow */}
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">{metric.label}</span>
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {metric.trend}%
        </div>
      </div>

      <div className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-white">
        {formatValue(animatedValue, metric.format, metric.prefix, metric.suffix)}
      </div>

      <div className="mt-4">
        <Sparkline data={metric.sparkline} color={isUp ? '#10b981' : '#f43f5e'} />
      </div>
    </GlassCard>
  );
}

// ─── OPPORTUNITY CARD ───────────────────────────────────────────────

const stageBadgeColors = {
  Discovery: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Qualification: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Proposal: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Negotiation: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Closing: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function OpportunityCard({ deal, index }) {
  const valStr = deal.value >= 1000 ? `$${(deal.value / 1000).toFixed(0)}K` : `$${deal.value}`;
  const badgeClass = stageBadgeColors[deal.stage] || 'bg-white/5 text-white/60 border-white/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.1 + index * 0.07 }}
    >
      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <AiScoreRing score={deal.aiScore} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{deal.name}</h4>
              {deal.momentum === 'up' && (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                >
                  <TrendingUp size={13} className="text-emerald-400" />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">{deal.company}</p>
          </div>
          <span className="font-mono text-sm font-bold text-white/80 shrink-0">{valStr}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
            {deal.stage}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── RISK CARD ──────────────────────────────────────────────────────

function RiskCard({ alert, index }) {
  const severityColors = {
    Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    High: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.15 + index * 0.07 }}
    >
      <GlassCard className="p-4 border-rose-500/10 bg-rose-500/[0.02]" hover={false}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white truncate">{alert.deal}</h4>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityColors[alert.severity]}`}>
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">{alert.risk}</p>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-white/30 font-medium">
              <Clock size={11} />
              <span>{alert.daysSilent} days silent</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── RECOMMENDATION CARD ────────────────────────────────────────────

const accentBorder = {
  indigo: 'border-l-indigo-500',
  emerald: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
};

const accentGlow = {
  indigo: 'bg-indigo-500/10',
  emerald: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
};

const accentIcon = {
  indigo: 'text-indigo-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
};

const accentButton = {
  indigo: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
};

function RecommendationCard({ rec, index }) {
  const Icon = rec.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.2 + index * 0.08 }}
    >
      <div className={`
        relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl
        border-l-2 ${accentBorder[rec.accent]} p-5
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      `}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentGlow[rec.accent]}`}>
            <Icon size={20} className={accentIcon[rec.accent]} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white">{rec.title}</h4>
            <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{rec.description}</p>
            <button className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${accentButton[rec.accent]}`}>
              <Zap size={12} />
              {rec.action}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── FOCUS TASK ─────────────────────────────────────────────────────

function FocusTask({ task, index }) {
  const [done, setDone] = useState(task.done);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring.gentle, delay: 0.3 + index * 0.06 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
        done ? 'opacity-50' : 'hover:bg-white/[0.03]'
      }`}
    >
      <button
        onClick={() => setDone(!done)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
          done
            ? 'border-emerald-500 bg-emerald-500/20'
            : 'border-white/20 hover:border-indigo-400'
        }`}
      >
        {done && <CheckCircle2 size={14} className="text-emerald-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${done ? 'text-white/30 line-through' : 'text-white/80'}`}>
          {task.text}
        </span>
      </div>

      <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-bold text-white/30 uppercase tracking-wide">
        {task.entity}
      </span>

      <span className="shrink-0 flex items-center gap-1 text-[11px] text-white/25 font-medium">
        <Clock size={11} />
        {task.time}
      </span>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────

export default function MissionControl() {
  const briefingText =
    "Your pipeline grew 12% this week. 3 deals are showing strong buying signals. Revenue is on track to exceed Q2 targets by $340K. Acme Corp's engagement score spiked — they're ready to close.";

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Ambient background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[400px] left-1/4 h-[800px] w-[800px] rounded-full bg-indigo-600/[0.07] blur-[120px]" />
        <div className="absolute -top-[200px] right-1/4 h-[600px] w-[600px] rounded-full bg-emerald-600/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 py-8 lg:px-8 space-y-10">

        {/* ─── SECTION A: AI Executive Briefing ──────────────────── */}
        <Section delay={0}>
          <div className="flex items-start justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.gentle }}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 mb-4"
              >
                <BrainCircuit size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Briefing</span>
              </motion.div>

              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                <span className="text-white">{getGreeting()}, </span>
                <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                  Commander
                </span>
              </h1>
              <p className="mt-2 text-sm text-white/30 font-medium">{formatDate()}</p>
              <div className="mt-4">
                <TypewriterBriefing text={briefingText} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.5 }}
              className="hidden lg:flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08]"
            >
              <Sparkles size={28} className="text-indigo-400" />
            </motion.div>
          </div>
        </Section>

        {/* ─── SECTION B: Revenue Pulse ──────────────────────────── */}
        <Section delay={0.15}>
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={18} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white/70">Revenue Pulse</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REVENUE_METRICS.map((metric, i) => (
              <MetricCard key={metric.label} metric={metric} index={i} />
            ))}
          </div>
        </Section>

        {/* ─── SECTION C: Opportunity Intelligence ───────────────── */}
        <Section delay={0.3}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hot Opportunities */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame size={18} className="text-amber-400" />
                <h2 className="text-lg font-bold text-white/70">Hot Opportunities</h2>
                <span className="ml-auto rounded-full bg-white/[0.05] px-2.5 py-0.5 text-xs font-bold text-white/30">
                  {HOT_OPPORTUNITIES.length} deals
                </span>
              </div>
              <div className="space-y-3">
                {HOT_OPPORTUNITIES.map((deal, i) => (
                  <OpportunityCard key={deal.id} deal={deal} index={i} />
                ))}
              </div>
            </div>

            {/* Risk Alerts */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-rose-400" />
                <h2 className="text-lg font-bold text-white/70">Risk Alerts</h2>
                <span className="ml-auto rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                  {RISK_ALERTS.filter(a => a.severity === 'Critical').length} critical
                </span>
              </div>
              <div className="space-y-3">
                {RISK_ALERTS.map((alert, i) => (
                  <RiskCard key={alert.id} alert={alert} index={i} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ─── SECTION D: Strategic Recommendations ──────────────── */}
        <Section delay={0.45}>
          <div className="flex items-center gap-2 mb-5">
            <Target size={18} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white/70">Strategic Recommendations</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {RECOMMENDATIONS.map((rec, i) => (
              <RecommendationCard key={rec.title} rec={rec} index={i} />
            ))}
          </div>
        </Section>

        {/* ─── SECTION E: Focus Zones ────────────────────────────── */}
        <Section delay={0.55}>
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {/* Subtle glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-[600px] rounded-full bg-indigo-500/[0.04] blur-3xl" />

            <div className="relative p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-amber-400" />
                <h2 className="text-lg font-bold text-white/70">Today's Priority Actions</h2>
                <span className="ml-auto text-xs font-medium text-white/25">
                  {FOCUS_TASKS.filter(t => !t.done).length} remaining
                </span>
              </div>

              <div className="space-y-1">
                {FOCUS_TASKS.map((task, i) => (
                  <FocusTask key={task.id} task={task} index={i} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
