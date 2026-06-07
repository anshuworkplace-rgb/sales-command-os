import { motion as fmotion } from 'framer-motion';
import { Award, Flame, CheckCircle2, Clock, ShieldCheck, Link2 } from 'lucide-react';
import { formatCompact } from '../../utils/formatUtils';
import AnimatedCounter from '../common/AnimatedCounter';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

export default function RepPerformanceCard({ metrics, userName, isManager }) {
  if (!metrics) return null;

  const {
    score, distinction, distinctionLabel, distinctionEmoji, distinctionColor,
    todayCount, isDailyTargetMet, isOnTimeToday,
    sheetSynced, manualAdded, streak, avgLeadsPerDay, target, revenue
  } = metrics;

  const scoreCirc = 2 * Math.PI * 34; // r=34

  return (
    <fmotion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f19] shadow-2xl">
      {/* Dynamic Background Glow based on distinction */}
      <div 
        className="absolute inset-0 opacity-10 blur-3xl pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: distinctionColor }}
      />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-white/[0.05] to-transparent pointer-events-none" />

      <div className="p-6 lg:p-8 relative z-10 flex flex-col lg:flex-row gap-8 items-center justify-between">
        
        {/* Left: User Identity & Distinction */}
        <div className="flex items-center gap-6 w-full lg:w-auto">
          <div className="relative group cursor-pointer">
            {/* SVG Score Ring around avatar */}
            <svg width="84" height="84" className="absolute -top-1 -left-1 transform -rotate-90">
              <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
              <fmotion.circle 
                cx="42" cy="42" r="38" fill="none" stroke={distinctionColor} strokeWidth="4"
                strokeDasharray={scoreCirc} 
                initial={{ strokeDashoffset: scoreCirc }}
                animate={{ strokeDashoffset: scoreCirc - (score / 100) * scoreCirc }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                strokeLinecap="round" 
              />
            </svg>

            <div 
              className="w-19 h-19 rounded-full flex items-center justify-center text-4xl shadow-xl z-10 relative m-0.5"
              style={{ backgroundColor: `${distinctionColor}15` }}
            >
              {distinctionEmoji}
            </div>
            
            {streak >= 3 && (
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 shadow-lg flex items-center gap-1 animate-pulse z-20">
                <Flame size={10} /> {streak} Day Streak!
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-2xl font-black text-tx-bright tracking-tight mb-1 flex items-center gap-2">
              {userName}
              {distinction === 'gold' && <ShieldCheck size={20} className="text-gold" />}
            </h2>
            <div className="flex items-center gap-2">
              <span 
                className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm"
                style={{ color: distinctionColor, borderColor: `${distinctionColor}30`, backgroundColor: `${distinctionColor}10`, boxShadow: `0 0 10px ${distinctionColor}20` }}
              >
                {distinctionLabel}
              </span>
              <span className="text-[11px] font-mono font-bold text-tx-ghost bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.05]">
                SCORE: <AnimatedCounter value={score} duration={1000} />/100
              </span>
            </div>
          </div>
        </div>

        {/* Right: Performance Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto flex-1 max-w-3xl">
          
          {/* Daily Input Compliance */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-tx-ghost uppercase tracking-wider">Today's Input</span>
              {isDailyTargetMet ? (
                <CheckCircle2 size={14} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
              ) : (
                <Clock size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
              )}
            </div>
            <div>
              <p className="text-xl font-black text-tx-bright flex items-end gap-1">
                <AnimatedCounter value={todayCount} /> <span className="text-xs text-tx-dim font-bold mb-1">/ 3</span>
              </p>
              <p className={`text-[9px] font-bold mt-1 ${isOnTimeToday ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
                {isOnTimeToday ? 'On Time (Before 10AM)' : 'Late Submission'}
              </p>
            </div>
          </div>

          {/* Sync Integrity */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-tx-ghost uppercase tracking-wider">Sheet Sync</span>
              <Link2 size={14} className="text-cyan drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
            </div>
            <div>
              <p className="text-xl font-black text-tx-bright flex items-end gap-1">
                <AnimatedCounter value={sheetSynced} /> <span className="text-xs text-tx-dim font-bold mb-1">synced</span>
              </p>
              <p className="text-[9px] font-bold text-tx-ghost mt-1">
                {manualAdded} added manually
              </p>
            </div>
          </div>

          {/* Average Velocity */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-tx-ghost uppercase tracking-wider">Avg Velocity</span>
              <Flame size={14} className="text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]" />
            </div>
            <div>
              <p className="text-xl font-black text-tx-bright flex items-end gap-1">
                <AnimatedCounter value={avgLeadsPerDay} /> <span className="text-xs text-tx-dim font-bold mb-1">/ day</span>
              </p>
              <p className="text-[9px] font-bold text-tx-ghost mt-1">
                Pipeline inflow rate
              </p>
            </div>
          </div>

          {/* Revenue Status */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-tx-ghost uppercase tracking-wider">Revenue Hit</span>
              <Award size={14} className="text-mint drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
            <div>
              <p className="text-xl font-black text-mint">
                ₹<AnimatedCounter value={revenue} isCompact={true} formatFn={formatCompact} />
              </p>
              <p className="text-[9px] font-bold text-tx-ghost mt-1">
                Target: ₹{formatCompact(target)}
              </p>
            </div>
          </div>

        </div>
      </div>
    </fmotion.div>
  );
}
