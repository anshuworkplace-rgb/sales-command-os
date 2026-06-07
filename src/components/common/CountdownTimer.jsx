import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

export default function CountdownTimer({ targetDate, compact = false }) {
  const [tl, setTl] = useState(calc(targetDate));
  
  useEffect(() => { 
    if (!targetDate) return; 
    const iv = setInterval(() => setTl(calc(targetDate)), 1000); 
    return () => clearInterval(iv); 
  }, [targetDate]);

  if (!targetDate) return <span className="text-txt-ghost text-[11px]">—</span>;
  
  const over = tl.total < 0;
  
  if (compact) return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        over ? 'bg-rose-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse' : 
        tl.total < 3600 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse' : 
        'bg-violet-400/30'
      }`} />
      <span className={`font-mono text-[11px] tabular-nums font-bold ${
        over ? 'text-rose-400 animate-pulse' : 
        tl.total < 3600 ? 'text-amber-400' : 
        'text-text-dim'
      }`}>
        {over ? '−' : ''}{tl.display}{over && <span className="text-[9px] ml-1 font-sans opacity-80 font-bold uppercase text-rose-500/80">overdue</span>}
      </span>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${
      over ? 'text-rose-400 animate-pulse font-black' : 
      tl.total < 3600 ? 'text-amber-400' : 
      'text-text-dim'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        over ? 'bg-rose-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse' : 
        tl.total < 3600 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse' : 
        'bg-violet-400/30'
      }`} />
      <span className="font-mono text-[12px] tabular-nums font-bold">
        {over ? 'OVERDUE: ' : ''}{tl.display}
      </span>
    </div>
  );
}

function calc(d) { 
  if (!d) return { total: 0, display: '--:--' }; 
  const t = differenceInSeconds(new Date(d), new Date()); 
  const a = Math.abs(t); 
  let s; 
  if (a < 60) s = `${a}s`; 
  else if (a < 3600) s = `${Math.floor(a/60)}m ${String(a%60).padStart(2,'0')}s`; 
  else if (a < 86400) s = `${Math.floor(a/3600)}h ${String(Math.floor((a%3600)/60)).padStart(2,'0')}m`; 
  else s = `${Math.floor(a/86400)}d ${Math.floor((a%86400)/3600)}h`; 
  return { total: t, display: s }; 
}
