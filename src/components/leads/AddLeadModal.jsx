import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Sparkles, Clock, Check, ChevronDown, Zap } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { parseHinglishFeedback, magicParseLeadText } from '../../engines/hinglishParser';
import { LEAD_SOURCES, BROKERS, TRADING_EXPERIENCE, STAGES, LEAD_TYPES, AGE_GROUPS } from '../../utils/constants';

export default function AddLeadModal() {
  const { isAddLeadOpen, closeAddLead, addLeadDefaults } = useUIStore();
  const { addLead } = useLeadStore();
  const userStore = useUserStore();
  const currentUserProfile = userStore.getCurrentUser?.() || userStore.currentUserProfile;
  const teamMembers = userStore.users || userStore.teamMembers || [];

  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    capital: '',
    notes: '',
    follow_up_note: '',
    source: 'google_ads',
    broker: '',
    trading_experience: '',
    assigned_to: '',
    lead_type: 'web_lead',
  });

  const [rawPaste, setRawPaste] = useState('');
  const [aiAutoFilledFields, setAiAutoFilledFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Apply defaults when opening from a specific tab
  useEffect(() => {
    if (isAddLeadOpen && addLeadDefaults) {
      setForm(f => ({ ...f, ...addLeadDefaults }));
    }
    if (isAddLeadOpen && currentUserProfile) {
      setForm(f => ({
        ...f,
        assigned_to: f.assigned_to || currentUserProfile.id,
      }));
    }
  }, [isAddLeadOpen, addLeadDefaults, currentUserProfile]);

  // Check for duplicates
  useEffect(() => {
    if (form.phone.trim().length >= 10) {
      const cleanPhone = form.phone.replace(/[^\d]/g, '');
      const leads = useLeadStore.getState().leads;
      const dup = leads.find(l => {
        const lPhone = (l.phone || '').replace(/[^\d]/g, '');
        return lPhone === cleanPhone || (cleanPhone.length > 10 && lPhone.includes(cleanPhone)) || (lPhone.length > 10 && cleanPhone.includes(lPhone));
      });
      if (dup) {
        setDuplicateWarning(`Duplicate found: ${dup.name || 'Unknown'} (${STAGES[dup.status] || dup.status})`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [form.phone]);

  // Parse feedback in real-time with Hinglish AI
  const aiDetection = useMemo(() => {
    return parseHinglishFeedback(form.notes, form.follow_up_note);
  }, [form.notes, form.follow_up_note]);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const applyAiSuggestions = () => {
    const updates = {};
    if (aiDetection.brokers.length > 0 && !form.broker) {
      updates.broker = aiDetection.brokers[0];
      setAiAutoFilledFields(prev => [...new Set([...prev, 'broker'])]);
    }
    if (aiDetection.capital && !form.capital) {
      updates.capital = aiDetection.capital.raw;
      setAiAutoFilledFields(prev => [...new Set([...prev, 'capital'])]);
    }
    setForm(f => ({ ...f, ...updates }));
  };

  // master 10x Magic Parser autocomplete trigger
  const handleMagicAutocomplete = () => {
    if (!rawPaste.trim()) return;
    const parsed = magicParseLeadText(rawPaste);
    if (!parsed) return;

    const filledFields = [];
    const newForm = { ...form };

    Object.keys(parsed).forEach(key => {
      if (parsed[key]) {
        newForm[key] = parsed[key];
        filledFields.push(key);
      }
    });

    setForm(newForm);
    setAiAutoFilledFields(filledFields);
  };

  const handleSubmit = async (andAddNext = false) => {
    if (!form.name.trim() && !form.phone.trim()) return;
    setSaving(true);
    try {
      const leadData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim() || null,
        capital: form.capital.trim() || null,
        capital_numeric: aiDetection.capital?.numeric || 0,
        notes: form.notes.trim() || null,
        follow_up_note: form.follow_up_note.trim() || null,
        source: form.source,
        broker: form.broker || null,
        trading_experience: form.trading_experience || null,
        assigned_to: form.assigned_to || currentUserProfile?.id,
        lead_type: form.lead_type,
        status: STAGES.FRESH_ENQUIRY,
        next_follow_up: aiDetection.followUpTime?.iso || null,
      };
      await addLead(leadData);

      if (andAddNext) {
        setForm(f => ({
          ...f,
          name: '', phone: '', city: '', capital: '',
          notes: '', follow_up_note: '',
          broker: '', trading_experience: '',
        }));
        setRawPaste('');
        setAiAutoFilledFields([]);
      } else {
        resetAndClose();
      }
    } catch (err) {
      console.error('Failed to create lead:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setForm({
      name: '', phone: '', city: '', capital: '',
      notes: '', follow_up_note: '',
      source: 'google_ads', broker: '', trading_experience: '',
      assigned_to: currentUserProfile?.id || '',
      lead_type: 'web_lead',
    });
    setRawPaste('');
    setAiAutoFilledFields([]);
    closeAddLead();
  };

  if (!isAddLeadOpen) return null;

  const salesReps = (teamMembers || []).filter(m => m.role === 'sales' || m.role === 'manager');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#0c0f1b] to-[#080a13] border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] sticky top-0 bg-[#0c0f1b]/95 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-electric to-blue-700 flex items-center justify-center animate-pulse-glow shadow-glow-electric">
              <Plus size={15} className="text-void font-bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading text-tx-bright">Add New Lead</h2>
              <p className="text-[10px] text-tx-ghost">Hinglish AI Engine Auto-Fill Ready</p>
            </div>
          </div>
          <button onClick={resetAndClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-txt-ghost transition">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ✨ 10x AI MAGIC QUICK PASTE PANEL ✨ */}
          <div className="bg-gradient-to-r from-violet-500/10 via-electric/5 to-purple-500/10 border border-violet-500/20 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-glow-violet/5">
            {/* Background glowing textures */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-electric/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 text-violet-300">
              <Sparkles size={14} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest font-heading">AI Magic Autocomplete</span>
              <span className="text-[8px] bg-violet-500/25 text-violet-200 border border-violet-500/30 px-1.5 py-0.2 rounded font-mono font-bold tracking-normal uppercase ml-auto">10x Speed</span>
            </div>

            <p className="text-[9.5px] text-tx-ghost leading-relaxed font-bold select-none">
              Paste a raw WhatsApp message, voice transcript, or type conversational Hinglish notes. The AI will instantly fill out the entire form below!
            </p>

            <div className="flex gap-2">
              <textarea
                value={rawPaste}
                onChange={e => setRawPaste(e.target.value)}
                placeholder="Paste here... (e.g. 'Kamesh Arya +919997157977, Jodhpur, capital 2L, broker angel one, manual trading krta hai, kal sham 5 baje call krne bola')"
                rows={2}
                className="flex-1 bg-[#06080f]/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-tx-bright placeholder-tx-ghost focus:border-violet-500/40 focus:outline-none transition resize-none font-medium leading-relaxed"
              />
              <button
                type="button"
                onClick={handleMagicAutocomplete}
                disabled={!rawPaste.trim()}
                className="px-4 bg-gradient-to-br from-violet-500 to-indigo-600 border border-violet-500/40 rounded-xl text-void font-extrabold text-[11px] hover:shadow-glow-violet active:scale-95 disabled:opacity-40 transition flex flex-col justify-center items-center gap-1.5 min-w-[80px]"
              >
                <Zap size={13} className="text-void" />
                <span>PARSE</span>
              </button>
            </div>

            {aiAutoFilledFields.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.03]">
                <Check size={11} className="text-mint animate-bounce" />
                <span className="text-[9px] font-bold text-mint font-mono uppercase tracking-wider">
                  Success: AI Auto-filled {aiAutoFilledFields.length} inputs!
                </span>
                <button
                  onClick={() => setAiAutoFilledFields([])}
                  className="text-[9px] text-tx-ghost hover:text-tx-dim font-bold hover:underline ml-auto"
                >
                  Clear Indicators
                </button>
              </div>
            )}
          </div>

          {/* Lead Type Toggle */}
          <div>
            <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-2">Lead Type</label>
            <div className="grid grid-cols-2 gap-2">
              {LEAD_TYPES.map(lt => (
                <button
                  key={lt.value}
                  onClick={() => handleChange('lead_type', lt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    form.lead_type === lt.value
                      ? 'bg-cyan/15 text-cyan border border-cyan/30 shadow-[0_0_10px_rgba(0,229,255,0.1)]'
                      : 'bg-white/[0.02] text-txt-dim border border-white/[0.05] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-base">{lt.icon}</span>
                  <div className="text-left">
                    <div>{lt.label}</div>
                    <div className="text-[9px] text-tx-ghost font-normal">{lt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                Name {aiAutoFilledFields.includes('name') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter client name..."
                className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition ${
                  aiAutoFilledFields.includes('name')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
                }`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                Mobile No. * {aiAutoFilledFields.includes('phone') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Enter mobile number..."
                className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition ${
                  duplicateWarning ? 'border-coral/50 focus:border-coral' :
                  aiAutoFilledFields.includes('phone')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
                }`}
              />
              {duplicateWarning && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-coral uppercase tracking-wider">
                  <X size={10} /> {duplicateWarning}
                </div>
              )}
            </div>
          </div>

          {/* City + Capital */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                City {aiAutoFilledFields.includes('city') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Enter city (e.g. Jodhpur)..."
                className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition ${
                  aiAutoFilledFields.includes('city')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
                }`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                Capital {aiAutoFilledFields.includes('capital') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
              </label>
              <input
                type="text"
                value={form.capital}
                onChange={(e) => handleChange('capital', e.target.value)}
                placeholder="Enter capital (e.g. 2 Lakh)..."
                className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition ${
                  aiAutoFilledFields.includes('capital')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
                }`}
              />
            </div>
          </div>

          {/* Feedback / Notes */}
          <div>
            <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
              Feedback / Notes {aiAutoFilledFields.includes('notes') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Type feedback / client notes here..."
              rows={3}
              className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition resize-none ${
                aiAutoFilledFields.includes('notes')
                  ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                  : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
              }`}
            />
          </div>

          {/* AI Detection Suggestions Banner */}
          {aiDetection.hasSuggestions && (
            <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-300">
                  <Sparkles size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">AI Detected Suggestions</span>
                </div>
                <button
                  onClick={applyAiSuggestions}
                  className="text-[10px] font-bold text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                >
                  <Check size={10} /> Apply All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiDetection.brokers.map(b => (
                  <span key={b} className="px-2 py-0.5 bg-sky-500/15 text-sky-300 rounded-md text-[10px] font-semibold border border-sky-500/10">
                    🏦 {b.charAt(0).toUpperCase() + b.slice(1).replace('_', ' ')}
                  </span>
                ))}
                {aiDetection.capital && (
                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md text-[10px] font-semibold border border-emerald-500/10">
                    💰 {aiDetection.capital.formatted}
                  </span>
                )}
                {aiDetection.experience.map(e => (
                  <span key={e.key} className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-md text-[10px] font-semibold border border-amber-500/10">
                    📊 {e.label}
                  </span>
                ))}
                {aiDetection.competitors.map(c => (
                  <span key={c.key} className="px-2 py-0.5 bg-rose-500/15 text-rose-300 rounded-md text-[10px] font-semibold border border-rose-500/10">
                    ⚔️ {c.label}
                  </span>
                ))}
                {aiDetection.objections.map(o => (
                  <span key={o.key} className="px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded-md text-[10px] font-semibold border border-orange-500/10">
                    🛡️ {o.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Note */}
          <div>
            <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
              Follow-up Note {aiAutoFilledFields.includes('follow_up_note') && <span className="text-[8px] font-bold text-violet-400 font-mono tracking-wider ml-1 select-none">⚡ AI</span>}
            </label>
            <input
              type="text"
              value={form.follow_up_note}
              onChange={(e) => handleChange('follow_up_note', e.target.value)}
              placeholder="Type follow-up instructions here..."
              className={`w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-xs text-tx-bright placeholder-tx-ghost focus:outline-none transition ${
                aiAutoFilledFields.includes('follow_up_note')
                  ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                  : 'border-white/[0.08] focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20'
              }`}
            />
          </div>

          {/* Parsed Follow-up Time */}
          {aiDetection.followUpTime && (
            <div className="bg-cyan/10 border border-cyan/20 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-[0_0_15px_rgba(0,229,255,0.02)]">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-cyan animate-pulse" />
                <span className="text-[11px] text-cyan font-bold font-mono">
                  📅 Parsed Schedule: {aiDetection.followUpTime.display}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                  aiDetection.followUpTime.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {aiDetection.followUpTime.confidence}
                </span>
              </div>
              <Check size={14} className="text-cyan/60" />
            </div>
          )}

          {/* Assign + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">Assign To</label>
              <select
                value={form.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                className="w-full bg-[#0a0d17] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-tx-bright focus:border-cyan/40 focus:outline-none appearance-none"
              >
                <option value="">Select Rep</option>
                {salesReps.map(rep => (
                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full bg-[#0a0d17] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-tx-bright focus:border-cyan/40 focus:outline-none appearance-none"
              >
                {LEAD_SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Broker + Experience (optional, or auto-filled by AI) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                Broker {aiAutoFilledFields.includes('broker') && <span className="text-violet-400 font-mono text-[8px] font-bold select-none ml-1">⚡ AI</span>}
              </label>
              <select
                value={form.broker}
                onChange={(e) => handleChange('broker', e.target.value)}
                className={`w-full bg-[#0a0d17] border rounded-xl px-3 py-2.5 text-xs text-tx-bright focus:outline-none appearance-none transition ${
                  aiAutoFilledFields.includes('broker')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40'
                }`}
              >
                <option value="">—</option>
                {BROKERS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">
                Experience {aiAutoFilledFields.includes('trading_experience') && <span className="text-violet-400 font-mono text-[8px] font-bold select-none ml-1">⚡ AI</span>}
              </label>
              <select
                value={form.trading_experience}
                onChange={(e) => handleChange('trading_experience', e.target.value)}
                className={`w-full bg-[#0a0d17] border rounded-xl px-3 py-2.5 text-xs text-tx-bright focus:outline-none appearance-none transition ${
                  aiAutoFilledFields.includes('trading_experience')
                    ? 'border-violet-500/50 bg-violet-500/[0.015] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'border-white/[0.08] focus:border-cyan/40'
                }`}
              >
                <option value="">—</option>
                {TRADING_EXPERIENCE.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-4 border-t border-white/[0.05] flex items-center gap-3">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving || (!form.name.trim() && !form.phone.trim())}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan to-mint text-void text-xs font-bold rounded-xl disabled:opacity-40 hover:shadow-neon-cyan transition flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : (
              <><Zap size={12} /> Create Lead</>
            )}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving || (!form.name.trim() && !form.phone.trim())}
            className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-txt-dim text-xs font-bold rounded-xl disabled:opacity-40 transition flex items-center gap-2"
          >
            <Plus size={12} /> Create & Next
          </button>
        </div>
      </div>
    </div>
  );
}
