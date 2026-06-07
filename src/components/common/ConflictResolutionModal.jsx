import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useToastStore from '../../stores/useToastStore';

export default function ConflictResolutionModal({ conflict, onClose }) {
  const { updateLead, leads } = useLeadStore();
  const { addToast } = useToastStore();

  if (!conflict) return null;
  const { leadId, localUpdates, serverLead } = conflict;

  const localLead = useMemo(() => {
    const orig = leads.find(l => l.id === leadId);
    return { ...orig, ...localUpdates };
  }, [leads, leadId, localUpdates]);

  const changedFields = useMemo(() => {
    const fields = [];
    const keys = new Set([...Object.keys(localUpdates), 'name', 'phone', 'city', 'revenue', 'status']);
    
    keys.forEach(k => {
      const serverVal = serverLead[k];
      const localVal = localLead[k];
      
      if (String(serverVal || '') !== String(localVal || '')) {
        fields.push({
          key: k,
          label: k.charAt(0).toUpperCase() + k.slice(1),
          server: serverVal,
          local: localVal,
        });
      }
    });
    return fields;
  }, [localUpdates, serverLead, localLead]);

  // Keep server values
  const handleKeepServer = () => {
    // Lead is already updated to latest server value in useLeadStore fallback, just close
    addToast('Server changes accepted. Local changes discarded.', 'info');
    onClose();
  };

  // Overwrite server values (Force override)
  const handleOverwrite = async () => {
    try {
      // We pass the server version + 1 as the lock to bypass version mismatch
      await updateLead(leadId, localUpdates, serverLead.version);
      addToast('Local changes forced successfully.', 'success');
      onClose();
    } catch (e) {
      addToast('Override failed: ' + e.message, 'error');
    }
  };

  // Auto Merge values
  const handleAutoMerge = async () => {
    const mergedUpdates = {};
    changedFields.forEach(f => {
      // If local modified it, keep local, else server
      if (f.key in localUpdates) {
        mergedUpdates[f.key] = f.local;
      } else {
        mergedUpdates[f.key] = f.server;
      }
    });

    try {
      await updateLead(leadId, mergedUpdates, serverLead.version);
      addToast('Fields merged successfully!', 'success');
      onClose();
    } catch (e) {
      addToast('Merge failed: ' + e.message, 'error');
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#0a0f1c]/90 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-gradient-to-br from-[#0d1525] to-[#0a0f1c] border border-coral/30 shadow-[0_10px_45px_rgba(239,68,68,0.15)] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-coral/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center">
                <ShieldAlert size={16} className="text-coral" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-coral">Concurrency Update Conflict Detected</h3>
                <p className="text-[10px] text-tx-ghost">Another representative updated this lead in the database</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-tx-ghost">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            
            <div className="text-xs text-tx-dim leading-relaxed flex gap-2 p-3 rounded-xl bg-coral/5 border border-coral/10">
              <AlertTriangle size={15} className="text-coral flex-shrink-0 mt-0.5" />
              <div>
                To avoid overwriting other modifications, review the differing fields below and select a merge resolution strategy.
              </div>
            </div>

            {/* Field Comparison Grid */}
            <div className="border border-white/[0.05] rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.05] text-[10px] uppercase font-black tracking-widest text-tx-ghost">
                    <th className="px-4 py-2">Field</th>
                    <th className="px-4 py-2 text-coral bg-coral/5">Server (Database)</th>
                    <th className="px-4 py-2 text-electric bg-electric/5">Local (Your Edit)</th>
                  </tr>
                </thead>
                <tbody>
                  {changedFields.map(f => (
                    <tr key={f.key} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                      <td className="px-4 py-3 font-bold text-tx-bright">{f.label}</td>
                      <td className="px-4 py-3 font-mono text-coral/80 bg-coral/[0.02]">
                        {f.key === 'revenue' ? `₹${Number(f.server || 0).toLocaleString('en-IN')}` : String(f.server || '—')}
                      </td>
                      <td className="px-4 py-3 font-mono text-electric/80 bg-electric/[0.02]">
                        {f.key === 'revenue' ? `₹${Number(f.local || 0).toLocaleString('en-IN')}` : String(f.local || '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                onClick={handleKeepServer}
                className="py-2.5 bg-white/5 border border-white/[0.06] hover:bg-white/10 rounded-xl text-tx-bright text-xs font-bold transition flex flex-col items-center justify-center gap-1"
              >
                <X size={14} className="text-coral" />
                <span>Discard Edits</span>
              </button>

              <button
                onClick={handleAutoMerge}
                className="py-2.5 bg-electric/[0.08] hover:bg-electric/[0.15] border border-electric/30 rounded-xl text-electric text-xs font-black transition flex flex-col items-center justify-center gap-1"
              >
                <Check size={14} />
                <span>Auto-Merge</span>
              </button>

              <button
                onClick={handleOverwrite}
                className="py-2.5 bg-coral/10 hover:bg-coral/20 border border-coral/30 rounded-xl text-coral text-xs font-black transition flex flex-col items-center justify-center gap-1"
              >
                <ShieldAlert size={14} />
                <span>Force Overwrite</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
