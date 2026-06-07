import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserPlus, Link2, Target, Users, Zap, X } from 'lucide-react';
import useUserStore from '../../stores/useUserStore';
import { formatCompact } from '../../utils/formatUtils';

export default function TeamSettings() {
  const { users, updateProfile, getCurrentUser } = useUserStore();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const mySquad = users.filter(u => u.manager_id === currentUser?.id);
  const unassignedReps = users.filter(u => !u.manager_id && u.id !== currentUser?.id && u.role === 'sales');
  
  // Admins see everyone
  const visibleReps = isAdmin ? users.filter(u => u.role !== 'admin') : mySquad;

  const [copied, setCopied] = useState(false);

  const handleUpdate = async (userId, field, value) => {
    try {
      await updateProfile(userId, { [field]: value });
    } catch (err) {
      alert("Failed to update. Make sure SQL migration is applied.");
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/signup?squad=${currentUser?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSquadTarget = mySquad.reduce((sum, u) => sum + Number(u.monthly_target || 0), 0);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[28px] font-black font-display text-txt-glow tracking-tight flex items-center gap-3">
            <Users size={28} className="text-violet" />
            SQUAD BUILDER
          </h2>
          <p className="text-[12px] text-txt-dim mt-1 font-mono uppercase tracking-widest">Construct and command your revenue engine</p>
        </div>

        <div className="flex gap-3">
          <button onClick={copyInviteLink} className="glass-3d px-5 py-3 rounded-xl border border-violet/30 hover:bg-violet/[0.05] transition-all flex items-center gap-2 group">
            <Link2 size={16} className="text-violet group-hover:rotate-12 transition-transform" />
            <span className="text-[12px] font-bold text-txt-bright tracking-widest uppercase">{copied ? 'LINK COPIED!' : 'INVITE OPERATIVE'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-3d p-5 border border-white/[0.05]">
          <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield size={12}/> Active Squad</div>
          <div className="text-[32px] font-black text-txt-glow">{mySquad.length} <span className="text-[14px] text-txt-dim">reps</span></div>
        </div>
        <div className="glass-3d p-5 border border-white/[0.05]">
          <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target size={12}/> Combined Target</div>
          <div className="text-[32px] font-black text-cyan">₹{formatCompact(totalSquadTarget)}</div>
        </div>
        <div className="glass-3d p-5 border border-white/[0.05]">
          <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><UserPlus size={12}/> Unassigned Pool</div>
          <div className="text-[32px] font-black text-amber">{unassignedReps.length} <span className="text-[14px] text-txt-dim">available</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Squad Roster */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[14px] font-black font-display text-txt-glow flex items-center gap-2">
            <Zap size={16} className="text-cyan" /> ACTIVE ROSTER
          </h3>
          
          {visibleReps.length === 0 ? (
            <div className="glass-3d border border-dashed border-white/10 p-10 text-center rounded-2xl flex flex-col items-center justify-center text-txt-ghost">
              <Users size={32} className="mb-3 opacity-50" />
              <div className="text-[14px] font-bold uppercase tracking-widest">Squad is empty</div>
              <div className="text-[12px] mt-2">Recruit unassigned operatives or send an invite link.</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleReps.map((rep, i) => (
                <motion.div key={rep.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-3d p-4 border border-white/[0.05] hover:border-cyan/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[14px] text-txt-bright shadow-inner">
                      {rep.avatar || '👤'}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-txt-glow flex items-center gap-2">
                        {rep.name}
                        {isAdmin && rep.role === 'manager' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet/20 text-violet font-mono font-bold tracking-wider">MANAGER</span>}
                      </div>
                      <div className="text-[11px] text-txt-dim font-mono">{rep.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-input/50 p-2 rounded-xl border border-white/[0.02] flex-1 md:flex-none">
                    <div className="flex-1 md:w-32">
                      <div className="flex justify-between text-[9px] font-bold text-txt-ghost uppercase mb-1.5">
                        <span>Monthly Quota</span>
                        <span className="text-cyan">₹{formatCompact(Number(rep.monthly_target || 0))}</span>
                      </div>
                      <input 
                        type="range" 
                        min="50000" max="1000000" step="50000"
                        value={rep.monthly_target || 150000}
                        onChange={(e) => handleUpdate(rep.id, 'monthly_target', e.target.value)}
                        className="w-full accent-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    <button onClick={() => handleUpdate(rep.id, 'manager_id', null)} className="w-8 h-8 rounded-lg bg-rose/10 hover:bg-rose/20 text-rose flex items-center justify-center transition-all" title="Remove from Squad">
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Unassigned Pool */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-black font-display text-txt-glow flex items-center gap-2">
            <UserPlus size={16} className="text-amber" /> RECRUITMENT POOL
          </h3>
          
          <div className="glass-3d p-4 border border-white/[0.05] h-[400px] overflow-y-auto">
            {unassignedReps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-txt-ghost text-center">
                <Shield size={24} className="mb-2 opacity-50" />
                <div className="text-[11px] font-bold uppercase tracking-widest">No Free Agents</div>
                <div className="text-[10px] mt-1">Share your invite link to add new users.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedReps.map((rep, i) => (
                  <motion.div key={rep.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-amber/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] font-bold text-txt-bright">{rep.name}</div>
                      <div className="text-[9px] text-txt-ghost font-mono">{rep.email.split('@')[0]}</div>
                    </div>
                    <button onClick={() => handleUpdate(rep.id, 'manager_id', currentUser?.id)} className="w-full py-1.5 bg-amber/10 hover:bg-amber/20 hover:shadow-[0_0_10px_rgba(255,190,10,0.2)] border border-amber/20 text-amber rounded-lg text-[10px] font-black tracking-widest uppercase transition-all">
                      Recruit to Squad
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 rounded-xl border border-cyan/10 bg-cyan/[0.02] flex items-start gap-3">
        <Shield size={16} className="text-cyan mt-0.5" />
        <div>
          <h4 className="text-[12px] font-bold text-txt-bright">God Mode Administration</h4>
          <p className="text-[11px] text-txt-dim leading-relaxed mt-1">
            Admins have full visibility and can map reporting structures. Managers can only see and adjust targets for their direct reports. Target changes are instant.
          </p>
        </div>
      </div>
    </div>
  );
}
