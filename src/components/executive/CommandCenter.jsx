import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, Gauge, Zap, DollarSign,
  AlertTriangle, Rocket, Shield, Clock, Users, ChevronRight,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, Flame,
  Crown, Sparkles, Signal, Brain, Eye,
} from 'lucide-react';
import { spring, stagger, fadeIn, slideUp } from '../../motion/index.js';

/* ─── Hardcoded Data ─────────────────────────────────────────────── */
const REVENUE_METRICS = [
  {
    label: 'Quarterly Revenue',
    value: '$4.2M',
    change: '+18.4%',
    trend: 'up',
    target: '$4.8M',
    icon: DollarSign,
    color: '#6366f1',
  },
  {
    label: 'Forecast Confidence',
    value: '87%',
    gauge: 0.87,
    icon: Gauge,
    color: '#10b981',
  },
  {
    label: 'Pipeline Coverage',
    value: '3.2x',
    bar: 0.80,
    benchmark: '3.0x',
    icon: Target,
    color: '#f59e0b',
  },
  {
    label: 'Win Rate Trend',
    value: '34%',
    change: '+2.1%',
    trend: 'up',
    sparkline: [22, 25, 23, 28, 26, 30, 29, 32, 31, 34],
    icon: Activity,
    color: '#8b5cf6',
  },
];

const PIPELINE_STAGES = [
  { name: 'Discovery', value: 2800000, count: 24, color: '#6366f1' },
  { name: 'Qualification', value: 1900000, count: 16, color: '#818cf8' },
  { name: 'Proposal', value: 1400000, count: 11, color: '#a78bfa' },
  { name: 'Negotiation', value: 980000, count: 7, color: '#10b981' },
  { name: 'Closing', value: 620000, count: 4, color: '#34d399' },
];

const TEAM = [
  {
    name: 'Jessica Park', role: 'Enterprise AE', initials: 'JP', color: '#6366f1',
    quota: 92, activeDeals: 14, revenue: '$1.38M', trend: 'up',
  },
  {
    name: 'Marcus Thompson', role: 'Mid-Market AE', initials: 'MT', color: '#10b981',
    quota: 107, activeDeals: 22, revenue: '$890K', trend: 'up',
  },
  {
    name: 'Sarah Kim', role: 'Enterprise AE', initials: 'SK', color: '#f59e0b',
    quota: 78, activeDeals: 9, revenue: '$720K', trend: 'down',
  },
  {
    name: 'David Chen', role: 'SMB AE', initials: 'DC', color: '#8b5cf6',
    quota: 115, activeDeals: 31, revenue: '$640K', trend: 'up',
  },
  {
    name: 'Aisha Rahman', role: 'Mid-Market AE', initials: 'AR', color: '#ec4899',
    quota: 84, activeDeals: 18, revenue: '$580K', trend: 'neutral',
  },
  {
    name: 'Tom Wilson', role: 'Enterprise AE', initials: 'TW', color: '#14b8a6',
    quota: 63, activeDeals: 7, revenue: '$410K', trend: 'down',
  },
];

const RISKS = [
  {
    severity: 'critical',
    title: 'Acme Corp deal stalled 21 days',
    description: 'No champion response since budget review. Risk of losing $1.2M opportunity to competitor.',
    revenue: '$1.2M',
  },
  {
    severity: 'critical',
    title: 'Q2 pipeline gap in Enterprise segment',
    description: 'Enterprise pipeline 23% below required coverage ratio. Need 4 new qualified opportunities.',
    revenue: '$3.4M',
  },
  {
    severity: 'warning',
    title: 'Key champion leaving Vertex Industries',
    description: 'Internal sponsor moving to new role in 30 days. Relationship transfer needed urgently.',
    revenue: '$680K',
  },
  {
    severity: 'warning',
    title: 'Competitor pricing undercut in SMB',
    description: 'Lost 3 SMB deals this month to aggressive pricing. Consider promotional response.',
    revenue: '$290K',
  },
];

const OPPORTUNITIES = [
  {
    title: 'Healthcare Vertical Expansion',
    value: '$2.1M',
    confidence: 84,
    action: 'Target 5 HIPAA-ready prospects from inbound pipeline',
  },
  {
    title: 'Product-Led Growth Upsell',
    value: '$890K',
    confidence: 91,
    action: 'Launch automated upgrade campaign for 120 qualifying accounts',
  },
  {
    title: 'Partner Channel Activation',
    value: '$1.4M',
    confidence: 72,
    action: 'Onboard 3 strategic integration partners from waitlist',
  },
];

/* ─── Mini Sparkline (pure SVG) ──────────────────────────────────── */
function Sparkline({ data, color = '#6366f1', width = 80, height = 28 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

/* ─── Circular Gauge ─────────────────────────────────────────────── */
function CircularGauge({ value, color = '#10b981', size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="4"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
      />
    </svg>
  );
}

/* ─── Metric Card ────────────────────────────────────────────────── */
function MetricCard({ metric, index }) {
  const Icon = metric.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: index * 0.06 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/[0.1] transition-all"
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
        style={{ backgroundColor: metric.color }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
            {metric.label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">{metric.value}</span>
            {metric.change && (
              <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                  metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {metric.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {metric.change}
              </span>
            )}
          </div>
          {metric.target && (
            <p className="text-[10px] text-zinc-500 mt-1">
              Target: <span className="text-zinc-400 font-bold">{metric.target}</span>
            </p>
          )}
          {metric.benchmark && (
            <p className="text-[10px] text-zinc-500 mt-1">
              Benchmark: <span className="text-zinc-400 font-bold">{metric.benchmark}</span>
            </p>
          )}
        </div>

        <div className="shrink-0">
          {metric.gauge !== undefined ? (
            <CircularGauge value={metric.gauge} color={metric.color} />
          ) : metric.sparkline ? (
            <Sparkline data={metric.sparkline} color={metric.color} />
          ) : metric.bar !== undefined ? (
            <div className="w-16 space-y-1">
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: metric.color }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${metric.bar * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ) : (
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${metric.color}15` }}
            >
              <Icon size={20} style={{ color: metric.color }} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function CommandCenter() {
  const totalPipeline = PIPELINE_STAGES.reduce((s, p) => s + p.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring.gentle}
      className="min-h-screen bg-[#09090b] overflow-y-auto hide-scrollbar"
    >
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Crown size={20} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  Executive Command Center
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real-time revenue intelligence · Q2 2026
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[11px] font-mono">
              Updated 12s ago
            </div>
          </div>
        </div>

        {/* ── Revenue Health (4 cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {REVENUE_METRICS.map((metric, i) => (
            <MetricCard key={metric.label} metric={metric} index={i} />
          ))}
        </div>

        {/* ── Pipeline Pressure Gauge ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <Gauge size={16} className="text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Pipeline Pressure Gauge</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white font-mono">
                ${(totalPipeline / 1000000).toFixed(1)}M
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Pipeline</p>
            </div>
          </div>

          {/* Segmented Bar */}
          <div className="flex rounded-xl overflow-hidden h-10 gap-[2px]">
            {PIPELINE_STAGES.map((stage, i) => {
              const pct = (stage.value / totalPipeline) * 100;
              return (
                <motion.div
                  key={stage.name}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="relative group cursor-pointer"
                  style={{ backgroundColor: stage.color }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white drop-shadow-lg">
                      ${(stage.value / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.name} className="text-center flex-1">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] text-zinc-400 font-medium">{stage.name}</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-300 font-mono">
                  ${(stage.value / 1000000).toFixed(1)}M
                </p>
                <p className="text-[9px] text-zinc-600">{stage.count} deals</p>
              </div>
            ))}
          </div>

          {/* Pipeline Velocity */}
          <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[11px] text-zinc-400 font-medium">Pipeline Velocity</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-extrabold text-white font-mono">$142K</span>
              <span className="text-[10px] text-zinc-500">/ week avg</span>
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUpRight size={12} /> +8.3%
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Team Performance + Risks Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Performance (takes 2 cols) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-zinc-500" />
              <h3 className="text-sm font-bold text-white">Team Performance</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEAM.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.gentle, delay: 0.3 + i * 0.05 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl hover:border-white/[0.1] transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[12px] font-bold text-white truncate">{member.name}</h4>
                      <p className="text-[10px] text-zinc-500">{member.role}</p>
                    </div>
                    {member.trend === 'up' && (
                      <ArrowUpRight size={14} className="text-emerald-400 shrink-0 ml-auto" />
                    )}
                    {member.trend === 'down' && (
                      <ArrowDownRight size={14} className="text-red-400 shrink-0 ml-auto" />
                    )}
                  </div>

                  {/* Quota Attainment */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                        Quota
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono ${
                          member.quota >= 100
                            ? 'text-emerald-400'
                            : member.quota >= 80
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {member.quota}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            member.quota >= 100
                              ? '#10b981'
                              : member.quota >= 80
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(member.quota, 120)}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-white font-mono">{member.activeDeals}</p>
                      <p className="text-[8px] text-zinc-600 uppercase tracking-wider">Deals</p>
                    </div>
                    <div className="w-px h-6 bg-white/[0.06]" />
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-white font-mono">{member.revenue}</p>
                      <p className="text-[8px] text-zinc-600 uppercase tracking-wider">Revenue</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Strategic Risk Radar */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-red-400" />
              <h3 className="text-sm font-bold text-white">Strategic Risk Radar</h3>
            </div>
            <div className="space-y-3">
              {RISKS.map((risk, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.gentle, delay: 0.4 + i * 0.06 }}
                  className={`rounded-2xl border p-4 backdrop-blur-xl ${
                    risk.severity === 'critical'
                      ? 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20'
                      : 'bg-amber-500/[0.03] border-amber-500/10 hover:border-amber-500/20'
                  } transition-all`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        risk.severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
                      }`}
                    >
                      <AlertTriangle
                        size={14}
                        className={
                          risk.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[12px] font-bold text-white">{risk.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                        {risk.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <DollarSign size={10} className="text-zinc-500" />
                        <span
                          className={`text-[11px] font-bold font-mono ${
                            risk.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                          }`}
                        >
                          {risk.revenue} at risk
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Growth Opportunities ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Rocket size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Growth Opportunities</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {OPPORTUNITIES.map((opp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.5 + i * 0.06 }}
                className="rounded-2xl border border-emerald-500/[0.08] bg-emerald-500/[0.02] p-5 backdrop-blur-xl hover:border-emerald-500/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-[13px] font-bold text-white">{opp.title}</h4>
                  <div
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  >
                    {opp.confidence}%
                  </div>
                </div>
                <p className="text-xl font-extrabold text-white font-mono mb-2">{opp.value}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  {opp.action}
                </p>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-bold">AI Recommended</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
