import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Trophy, Zap, Target, AlertTriangle, Edit3, Check, ChevronUp, ChevronDown, Flame } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { formatCompact } from '../../utils/formatUtils';
import { STAGE_LABELS, PIPELINE_STAGES, LEAD_SOURCES } from '../../utils/constants';
import AnimatedCounter from '../common/AnimatedCounter';
import { calculateDRR, requiredDRR, getMonthProgress, getOfficeStatus, calculateRepScore, generateIntelligence } from '../../engines/salesIntelligence';

const COLORS = ['#38bdf8','#a78bfa','#fbbf24','#34d399','#f87171','#60a5fa','#f472b6'];
const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div className="bg-[#0a0f1c]/95 border border-white/[0.08] rounded-xl px-3 py-2 shadow-lg">
    <p className="text-[10px] text-txt-ghost font-mono mb-1">{label}</p>
    {payload.map((p,i)=><p key={i} className="text-[11px] font-bold" style={{color:p.color}}>{p.name}: {typeof p.value==='number'&&p.value>100?formatCompact(p.value):p.value}</p>)}
  </div>;
};

export default function NumbersDashboard() {
  const { leads } = useLeadStore();
  const { users, getCurrentUser, updateProfile } = useUserStore();
  const { viewFilter, setViewFilter } = useUIStore();
  const cur = getCurrentUser();
  const isM = ['manager','admin'].includes(cur?.role);
  const reps = users.filter(u=>u.role==='sales');
  const [editTarget, setEditTarget] = useState(null);
  const [targetVal, setTargetVal] = useState('');

  const mp = getMonthProgress();
  const office = getOfficeStatus();

  const vis = useMemo(()=>{
    if(isM && viewFilter==='all') return leads;
    if(isM && viewFilter!=='all') return leads.filter(l=>l.assigned_to===viewFilter);
    return leads.filter(l=>l.assigned_to===cur?.id);
  },[leads,isM,viewFilter,cur]);

  // Core metrics
  const m = useMemo(()=>{
    const rev = vis.reduce((s,l)=>s+(Number(l.revenue)||0),0);
    const conv = vis.filter(l=>l.status==='converted').length;
    const total = vis.length;
    const active = vis.filter(l=>!['converted','lost','not_now'].includes(l.status)).length;
    const target = isM && viewFilter==='all' ? reps.reduce((s,u)=>s+Number(u.monthly_target||100000),0) : Number((isM ? users.find(u=>u.id===viewFilter) : cur)?.monthly_target||100000);
    const drr = calculateDRR(rev, mp.workingDaysElapsed);
    const reqDrr = requiredDRR(target, rev, mp.workingDaysRemaining);
    const projected = rev + drr * mp.workingDaysRemaining;
    const att = target>0?Math.round((rev/target)*100):0;
    return { rev, conv, total, active, target, drr, reqDrr, projected, att, convRate: total>0?((conv/total)*100).toFixed(1):'0' };
  },[vis,isM,viewFilter,cur,reps,users,mp]);

  // Leaderboard
  const board = useMemo(()=>{
    return reps.map((u,_,arr)=>{
      const s = calculateRepScore(u, leads);
      return { ...u, ...s, rank: 0 };
    }).sort((a,b)=>b.revenue-a.revenue).map((r,i)=>({...r,rank:i+1}));
  },[reps,leads]);

  // Intelligence alerts
  const alerts = useMemo(()=>isM?generateIntelligence(leads,users):[],[isM,leads,users]);

  // Funnel
  const funnel = useMemo(()=>PIPELINE_STAGES.map(s=>({name:STAGE_LABELS[s],count:vis.filter(l=>l.status===s).length})),[vis]);

  // Daily revenue (14d)
  const daily = useMemo(()=>{
    const days=[];
    for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().split('T')[0];const dl=vis.filter(l=>l.created_at?.startsWith(ds));
      days.push({date:d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}),leads:dl.length,revenue:dl.reduce((s,l)=>s+(Number(l.revenue)||0),0)});}
    return days;
  },[vis]);

  // Stage velocity
  const velocity = useMemo(()=>PIPELINE_STAGES.slice(0,-1).map(stage=>{
    const inS=vis.filter(l=>l.status===stage);
    const avg=inS.length>0?inS.reduce((s,l)=>s+((Date.now()-new Date(l.updated_at||l.created_at).getTime())/86400000),0)/inS.length:0;
    return {name:STAGE_LABELS[stage].substring(0,8),days:Math.round(avg*10)/10};
  }),[vis]);

  // Sources
  const sources = useMemo(()=>{
    const map={};
    vis.forEach(l=>{const src=l.source||'manual';const lb=LEAD_SOURCES.find(s=>s.value===src)?.label||src;if(!map[lb])map[lb]={total:0,converted:0,revenue:0};map[lb].total++;if(l.status==='converted'){map[lb].converted++;map[lb].revenue+=Number(l.revenue)||0;}});
    return Object.entries(map).map(([name,d])=>({name,...d,convRate:d.total>0?Math.round((d.converted/d.total)*100):0})).sort((a,b)=>b.total-a.total);
  },[vis]);

  const saveTarget = async(userId)=>{
    const v = parseInt(targetVal);
    if(v>0){ await updateProfile(userId,{monthly_target:v}); setEditTarget(null); setTargetVal(''); }
  };

  const pct = m.att;
  const ringColor = pct>=100?'#00ffb2':pct>=66?'#00e5ff':pct>=33?'#fbbf24':'#ff4d6a';

  return (
    <div className="h-full overflow-y-auto scrollbar-none p-4 md:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[18px] font-black font-display text-txt-glow flex items-center gap-2"><BarChart3 size={16} className="text-cyan"/>Performance HQ</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-txt-ghost font-mono">{mp.monthName}</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${office.isOfficeHours?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
              {office.isOfficeHours?`🟢 Open · ${office.currentTime}`:'🔴 Closed'}
            </span>
          </div>
        </div>
        {isM&&<select value={viewFilter} onChange={e=>setViewFilter(e.target.value)} className="bg-surface-card border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-[10px] text-txt-bright font-bold outline-none">
          <option value="all">👥 All Team</option>
          {reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>}
      </div>

      {/* TARGET RING + DRR + KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-4">
        {/* Target Ring */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="glass-3d p-4 flex flex-col xs:flex-row lg:flex-col xl:flex-col gap-4 items-center xs:items-start lg:items-center xl:items-center">
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" className="progress-ring"><circle cx="50" cy="50" r="42" className="ring-bg" strokeWidth="4"/><circle cx="50" cy="50" r="42" className="ring-fill" strokeWidth="4" stroke={ringColor} strokeDasharray={264} strokeDashoffset={264-(Math.min(pct,100)/100)*264}/></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[20px] font-black font-display" style={{color:ringColor}}>{pct}%</span>
              <span className="text-[7px] text-txt-ghost uppercase tracking-widest">of target</span>
            </div>
          </div>
          <div className="space-y-2 flex-1 w-full text-center xs:text-left lg:text-center xl:text-center">
            <div><span className="text-[9px] text-txt-ghost uppercase tracking-wider font-bold block">Revenue</span><span className="text-[22px] font-black font-display neon-cyan leading-none block">{formatCompact(m.rev)}</span></div>
            <div className="flex justify-center xs:justify-start lg:justify-center xl:justify-center gap-4">
              <div><span className="text-[8px] text-txt-ghost uppercase block">Target</span><span className="text-[11px] font-bold font-mono text-txt-dim block">{formatCompact(m.target)}</span></div>
              <div><span className="text-[8px] text-txt-ghost uppercase block">Gap</span><span className="text-[11px] font-bold font-mono text-red-400 block">{formatCompact(Math.max(0,m.target-m.rev))}</span></div>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${ringColor},${ringColor}88)`,boxShadow:`0 0 8px ${ringColor}40`}}/></div>
            <div className="flex justify-between text-[8px] text-txt-ghost font-mono"><span>Day {mp.dayOfMonth}/{mp.totalDays}</span><span>{mp.workingDaysRemaining} days left</span></div>
          </div>
        </motion.div>

        {/* DRR Card */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.05}} className="glass-3d p-4">
          <div className="flex items-center gap-2 mb-3"><Zap size={13} className="text-amber-400"/><span className="text-[11px] font-bold text-txt-bright uppercase tracking-wider">Daily Run Rate</span></div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div><span className="text-[8px] text-txt-ghost uppercase block">Current DRR</span><span className="text-[20px] font-black font-display text-emerald-400 leading-none block truncate">{formatCompact(m.drr)}</span><span className="text-[8px] text-txt-ghost">/day</span></div>
            <div className="text-right"><span className="text-[8px] text-txt-ghost uppercase block">Required DRR</span><span className={`text-[20px] font-black font-display leading-none block truncate ${m.reqDrr>m.drr*1.3?'text-red-400':'text-emerald-400'}`}>{formatCompact(m.reqDrr)}</span><span className="text-[8px] text-txt-ghost">/day</span></div>
          </div>
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
            <div className="mt-0.5">{m.drr>=m.reqDrr?<ChevronUp size={12} className="text-emerald-400 flex-shrink-0"/>:<ChevronDown size={12} className="text-red-400 flex-shrink-0"/>}</div>
            <span className={`text-[9.5px] font-bold leading-normal ${m.drr>=m.reqDrr?'text-emerald-400':'text-red-400'}`}>
              {m.drr>=m.reqDrr?'On track! Maintain pace':'Behind pace — accelerate'}
            </span>
          </div>
          <div className="mt-3"><span className="text-[8px] text-txt-ghost uppercase block mb-1">Projected Month-End</span>
            <span className={`text-[13px] font-black font-display inline-block ${m.projected>=m.target?'text-emerald-400':'text-amber-400'}`}>{formatCompact(m.projected)}</span>
            <span className="text-[9px] text-txt-ghost ml-1 font-bold">({m.projected>=m.target?'✅ On target':'⚠️ Below target'})</span>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="grid grid-cols-2 gap-2">
          {[{l:'Converted',v:m.conv,c:'text-emerald-400'},{l:'Conv Rate',v:m.convRate+'%',c:parseFloat(m.convRate)>15?'text-emerald-400':'text-amber-400',t:true},{l:'Active Leads',v:m.active,c:'text-sky-400'},{l:'Total Leads',v:m.total,c:'text-violet-400'}].map((s,i)=>
            <div key={s.l} className="glass-3d p-3"><div className="text-[8px] text-txt-ghost uppercase tracking-wider font-bold mb-1">{s.l}</div>
              {s.t?<div className={`text-[18px] font-black font-display ${s.c}`}>{s.v}</div>:<AnimatedCounter value={s.v} className={`text-[18px] font-black font-display tabular-nums ${s.c}`}/>}
            </div>
          )}
        </motion.div>
      </div>

      {/* AI INTELLIGENCE ALERTS (Manager) */}
      {isM && alerts.length>0 && <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.12}} className="glass-3d p-4 border-amber-500/15">
        <h3 className="text-[12px] font-bold text-txt-bright mb-3 flex items-center gap-2"><AlertTriangle size={13} className="text-amber-400"/>AI Alerts</h3>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">{alerts.slice(0,6).map((a,i)=>
          <div key={i} className={`p-2.5 rounded-xl border ${a.type==='danger'?'border-red-500/20 bg-red-500/[0.02]':a.type==='warning'?'border-amber-500/20 bg-amber-500/[0.02]':'border-emerald-500/20 bg-emerald-500/[0.02]'}`}>
            <div className="text-[10px] font-bold text-txt-bright">{a.icon} {a.title}</div>
            <div className="text-[9px] text-txt-dim mt-0.5">{a.desc}</div>
          </div>
        )}</div>
      </motion.div>}

      {/* COMPETITION LEADERBOARD (visible to ALL) */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="glass-3d p-4">
        <h3 className="text-[13px] font-bold text-txt-bright mb-3.5 flex items-center gap-2"><Trophy size={13} className="text-amber-400"/>Leaderboard — {mp.monthName}</h3>
        <div className="space-y-2.5">{board.map((rep,i)=>{
          const isMe = rep.id===cur?.id;
          return <div key={rep.id} className={`relative flex flex-col p-3 rounded-xl border transition-all ${isMe?'border-cyan/25 bg-cyan/[0.03] shadow-[0_0_12px_rgba(0,229,255,0.06)]':i===0?'border-amber-500/20 bg-amber-500/[0.03]':'border-white/[0.04] bg-white/[0.01]'} overflow-hidden`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[12px] flex-shrink-0 ${i===0?'bg-amber-500/15 text-amber-400':i===1?'bg-slate-400/15 text-slate-300':i===2?'bg-orange-800/15 text-orange-400':'bg-white/5 text-txt-ghost'}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:`${rep.color}15`,color:rep.color}}>{rep.avatar||rep.name?.substring(0,2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-txt-bright truncate block">{rep.name}</span>{isMe&&<span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan/10 text-cyan font-bold border border-cyan/20">YOU</span>}{rep.score>=80&&<Flame size={10} className="text-orange-400 flex-shrink-0"/>}</div>
                <div className="text-[9px] text-txt-ghost truncate">{rep.converted} conv · DRR {formatCompact(rep.drr)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] font-black font-display text-emerald-400">{formatCompact(rep.revenue)}</div>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[9px] font-mono text-txt-ghost">{rep.attainment}%</span>
                  {isM&&<button onClick={()=>{setEditTarget(rep.id);setTargetVal(String(rep.target));}} className="text-txt-ghost hover:text-cyan"><Edit3 size={8}/></button>}
                </div>
              </div>
            </div>
            {/* Absolute bottom progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.02]">
              <div className={`h-full ${rep.attainment>=100?'bg-emerald-400':rep.attainment>=50?'bg-amber-400':'bg-cyan'}`} style={{width:`${Math.min(rep.attainment,100)}%`}}/>
            </div>
            {/* Inline target edit */}
            {editTarget===rep.id&&<div className="flex gap-1 mt-2 pt-2 border-t border-white/[0.04] justify-end" onClick={e=>e.stopPropagation()}>
              <input type="number" value={targetVal} onChange={e=>setTargetVal(e.target.value)} className="w-20 bg-input border border-white/[0.06] rounded-lg px-2 py-1 text-[9px] text-txt-glow outline-none" placeholder="₹ Target"/>
              <button onClick={()=>saveTarget(rep.id)} className="p-1 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20"><Check size={10}/></button>
            </div>}
          </div>;
        })}</div>
      </motion.div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-4">
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="glass-3d p-4">
          <h3 className="text-[12px] font-bold text-txt-bright mb-3">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={180}><BarChart data={funnel} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)"/><XAxis type="number" tick={{fontSize:9,fill:'#3d4663'}} axisLine={false} tickLine={false} allowDecimals={false}/><YAxis dataKey="name" type="category" tick={{fontSize:8,fill:'#7b87a8'}} axisLine={false} tickLine={false} width={75}/><Tooltip content={<Tip/>}/><Bar dataKey="count" name="Leads" radius={[0,6,6,0]}>{funnel.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.75}/>)}</Bar></BarChart></ResponsiveContainer>
        </motion.div>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.25}} className="glass-3d p-4">
          <h3 className="text-[12px] font-bold text-txt-bright mb-3">Lead Acquisition (14d)</h3>
          <ResponsiveContainer width="100%" height={180}><AreaChart data={daily}><defs><linearGradient id="gc2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)"/><XAxis dataKey="date" tick={{fontSize:8,fill:'#3d4663'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#3d4663'}} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip content={<Tip/>}/><Area type="monotone" dataKey="leads" stroke="#38bdf8" fill="url(#gc2)" strokeWidth={2} name="Leads"/></AreaChart></ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-4">
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass-3d p-4">
          <h3 className="text-[12px] font-bold text-txt-bright mb-3">Source ROI</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="40%" height={140}><PieChart><Pie data={sources.length>0?sources:[{name:'None',total:1}]} cx="50%" cy="50%" outerRadius={45} innerRadius={22} dataKey="total" stroke="none">{(sources.length>0?sources:[{name:'None',total:1}]).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.8}/>)}</Pie></PieChart></ResponsiveContainer>
            <div className="flex-1 space-y-1.5">{sources.slice(0,5).map((s,i)=><div key={s.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/><span className="text-[9px] text-txt-dim flex-1 truncate">{s.name}</span><span className="text-[9px] font-mono font-bold text-txt-bright">{s.total}</span><span className="text-[8px] font-mono text-emerald-400">{s.convRate}%</span></div>)}</div>
          </div>
        </motion.div>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.35}} className="glass-3d p-4">
          <h3 className="text-[12px] font-bold text-txt-bright mb-3 flex items-center gap-2"><Clock size={12} className="text-amber-400"/>Avg Days in Stage</h3>
          <ResponsiveContainer width="100%" height={140}><BarChart data={velocity}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)"/><XAxis dataKey="name" tick={{fontSize:7,fill:'#7b87a8'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#3d4663'}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Bar dataKey="days" name="Avg Days" radius={[4,4,0,0]}>{velocity.map((e,i)=><Cell key={i} fill={e.days>3?'#f87171':e.days>1?'#fbbf24':'#34d399'} fillOpacity={0.75}/>)}</Bar></BarChart></ResponsiveContainer>
        </motion.div>
      </div>

      {/* Month progress bar */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-3d p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-txt-bright">Month Progress</span><span className="text-[10px] text-txt-ghost font-mono">{mp.monthPercent}%</span></div>
        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald-400" style={{width:`${mp.monthPercent}%`,boxShadow:'0 0 10px rgba(0,229,255,0.3)'}}/></div>
      </motion.div>
    </div>
  );
}
