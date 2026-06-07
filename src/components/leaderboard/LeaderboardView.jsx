import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, TrendingUp, Medal, Crown, Calendar, Edit2, Check, X } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { formatCompact } from '../../utils/formatUtils';
import { calculateRepScore, getMonthProgress } from '../../engines/salesIntelligence';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function LeaderboardView() {
  const { leads } = useLeadStore();
  const { users, getCurrentUser, getRepMonthlyTarget, setMonthlyTarget } = useUserStore();
  const { setActivePage, setViewFilter, selectedMonth, setSelectedMonth } = useUIStore();
  const cur = getCurrentUser();
  const reps = users.filter(u => u.role === 'sales');
  const isM = ['manager', 'admin'].includes(cur?.role);

  const [editingRepId, setEditingRepId] = useState(null);
  const [newTargetVal, setNewTargetVal] = useState('');

  const [selYear, selMonth] = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return [parseInt(y, 10), parseInt(m, 10) - 1];
  }, [selectedMonth]);

  const mp = getMonthProgress(selYear, selMonth);

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

  const board = useMemo(() => {
    return reps.map(u => {
      const target = getRepMonthlyTarget(u.id, selectedMonth);
      const s = calculateRepScore(u, leads, target, selYear, selMonth);
      return { ...u, ...s, rank: 0 };
    }).sort((a, b) => b.revenue - a.revenue).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [reps, leads, selectedMonth, selYear, selMonth, getRepMonthlyTarget]);

  const podium = board.slice(0, 3);
  const rest = board.slice(3);

  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* Control Row with Month Selector */}
      <div className="flex justify-between items-center bg-[#0d1322]/80 border border-white/[0.05] p-3 rounded-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-gold" />
          <span className="text-xs font-bold text-tx-bright font-heading">Leaderboard Rankings</span>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-tx-bright font-bold">
          <Calendar size={13} className="text-electric" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-tx-bright outline-none font-bold cursor-pointer font-sans"
          >
            {monthOptions.map(o => (
              <option key={o.val} value={o.val} className="bg-[#0b0f19] text-tx-bright">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <motion.div variants={fadeUp} className="text-center">
        <h1 className="text-2xl font-extrabold font-heading text-tx-glow flex items-center justify-center gap-2">
          🏆 Top Performers
        </h1>
        <p className="text-[12px] text-tx-dim mt-1 font-mono">{mp.monthName} · Sales Performance</p>
      </motion.div>

      {/* Podium */}
      {podium.length >= 2 && (
        <motion.div variants={fadeUp} className="flex items-end justify-center gap-3 lg:gap-6 pt-8">
          {podiumOrder.map((rep, vi) => {
            const actualRank = rep.rank;
            const isMe = rep.id === cur?.id;
            const heights = { 1: 'h-40', 2: 'h-32', 3: 'h-28' };
            const colors = {
              1: { bg: 'from-yellow-500/25 to-amber-600/10', border: 'border-gold/30', text: 'text-gold', crown: '👑' },
              2: { bg: 'from-gray-400/20 to-gray-500/5', border: 'border-gray-400/25', text: 'text-gray-300', crown: '🥈' },
              3: { bg: 'from-orange-700/20 to-orange-800/5', border: 'border-orange-600/20', text: 'text-orange-400', crown: '🥉' },
            };
            const c = colors[actualRank] || colors[3];

            return (
              <motion.div
                key={rep.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: vi * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => {
                  if (isM) {
                    setViewFilter(rep.id);
                    setActivePage('pipeline');
                  }
                }}
                className={`flex flex-col items-center ${isM ? 'cursor-pointer group' : ''}`}
              >
                {/* Crown / Rank */}
                <div className="text-3xl mb-2">{c.crown}</div>

                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold mb-2 border-2 ${c.border} ${isMe ? 'ring-2 ring-electric/40' : ''} group-hover:scale-105 group-hover:shadow-lg transition-all`}
                  style={{ background: `linear-gradient(135deg, ${rep.color || '#3b82f6'}25, ${rep.color || '#3b82f6'}08)`, color: rep.color || '#3b82f6' }}>
                  {rep.avatar || rep.name?.substring(0, 2).toUpperCase()}
                </div>

                <span className={`text-[13px] font-bold ${isMe ? 'text-electric' : 'text-tx-bright'} mb-0.5`}>
                  {rep.name?.split(' ')[0]}
                </span>
                {isMe && <span className="text-[8px] px-1.5 py-0.5 rounded bg-electric/10 text-electric font-bold border border-electric/20 mb-1">YOU</span>}

                {/* Revenue */}
                <span className={`text-lg font-extrabold font-heading ${c.text}`}>
                  {formatCompact(rep.revenue)}
                </span>

                {/* Podium Base */}
                <div className={`${heights[actualRank]} w-24 lg:w-32 mt-3 rounded-t-xl bg-gradient-to-t ${c.bg} border ${c.border} border-b-0 flex flex-col items-center justify-start pt-3 gap-1`}>
                  <span className="text-[10px] text-tx-bright font-bold">{rep.converted} closed</span>
                  <span className="text-[10px] text-tx-ghost">{rep.attainment}% attainment</span>
                  
                  {/* Inline Target display/edit on Podium base */}
                  {editingRepId === rep.id ? (
                    <div className="flex items-center gap-1 mt-1 px-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        value={newTargetVal}
                        onChange={(e) => setNewTargetVal(e.target.value)}
                        className="w-12 bg-[#0b0f19] border border-white/[0.1] rounded px-1 py-0.5 text-[9px] text-tx-bright font-bold text-center"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          await setMonthlyTarget(rep.id, selectedMonth, newTargetVal);
                          setEditingRepId(null);
                        }}
                        className="p-0.5 rounded bg-mint text-white"
                      >
                        <Check size={8} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] text-tx-ghost mt-0.5">
                      <span>Tgt: {formatCompact(rep.target)}</span>
                      {isM && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRepId(rep.id);
                            setNewTargetVal(rep.target);
                          }}
                          className="hover:text-electric p-0.5"
                        >
                          <Edit2 size={8} />
                        </button>
                      )}
                    </div>
                  )}

                  {rep.score >= 80 && <Flame size={14} className="text-orange-400 mt-1 animate-pulse" />}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Rest of the board */}
      <motion.div variants={fadeUp} className="space-y-2">
        {rest.map((rep) => {
          const isMe = rep.id === cur?.id;
          return (
            <div
              key={rep.id}
              onClick={() => {
                if (isM) {
                  setViewFilter(rep.id);
                  setActivePage('pipeline');
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left cursor-pointer ${
                isMe
                  ? 'border-electric/20 bg-electric/[0.03] hover:bg-electric/[0.06]'
                  : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]'
              }`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-tx-ghost bg-white/[0.04] flex-shrink-0">
                {rep.rank}
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: `${rep.color}15`, color: rep.color }}>
                {rep.avatar || rep.name?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-tx-bright truncate">{rep.name}</span>
                  {isMe && <span className="text-[8px] px-1.5 py-0.5 rounded bg-electric/10 text-electric font-bold border border-electric/20">YOU</span>}
                </div>
                <div className="text-[10px] text-tx-ghost mt-0.5">
                  {rep.converted} conversions · DRR ₹{formatCompact(rep.drr)} · Score {rep.score}/100
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[15px] font-extrabold text-mint font-heading">{formatCompact(rep.revenue)}</div>
                
                {/* Inline Target display/edit on Row */}
                {editingRepId === rep.id ? (
                  <div className="flex items-center gap-1 mt-1 justify-end" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      value={newTargetVal}
                      onChange={(e) => setNewTargetVal(e.target.value)}
                      className="w-16 bg-[#162035] border border-white/[0.1] rounded px-1 py-0.5 text-[10px] text-tx-bright font-bold"
                      placeholder="Target"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        await setMonthlyTarget(rep.id, selectedMonth, newTargetVal);
                        setEditingRepId(null);
                      }}
                      className="p-1 rounded bg-mint/15 text-mint border border-mint/20 hover:bg-mint/25"
                    >
                      <Check size={10} />
                    </button>
                    <button
                      onClick={() => setEditingRepId(null)}
                      className="p-1 rounded bg-coral/15 text-coral border border-coral/20 hover:bg-coral/25"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5 justify-end">
                    <span className="text-[9px] font-mono text-tx-ghost">{rep.attainment}% of ₹{formatCompact(rep.target)}</span>
                    {isM && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRepId(rep.id);
                          setNewTargetVal(rep.target);
                        }}
                        className="text-tx-ghost hover:text-electric transition p-0.5"
                      >
                        <Edit2 size={9} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {board.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-lg font-extrabold font-heading text-tx-glow">No Sales Reps Yet</h3>
          <p className="text-[12px] text-tx-dim mt-2">Add team members to see the leaderboard.</p>
        </div>
      )}
    </motion.div>
  );
}
