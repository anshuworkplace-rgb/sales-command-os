import { useState } from 'react';
import { MapPin, IndianRupee, User, Clock, Calendar, Building, ShieldAlert, Award } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import { BROKERS, TRADING_EXPERIENCE, AGE_GROUPS, LEAD_SOURCES, QUICK_DISPOSITIONS, STAGES, STAGE_LABELS } from '../../utils/constants';
import { formatPhoneDisplay } from '../../services/sheetsSync';
import { inferFollowUpFromFeedback } from '../../engines/aiDecisionEngine';

export default function LeadDrawerOverview({ lead, ai }) {
  const { updateLead, rescheduleFollowUp } = useLeadStore();
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({
    city: lead?.city || '',
    capital: lead?.capital || '',
    broker: lead?.broker || '',
    trading_experience: lead?.trading_experience || '',
    age_group: lead?.age_group || '',
  });
  const [fuDate, setFuDate] = useState('');

  const saveMeta = async () => {
    await updateLead(lead.id, metaForm);
    setIsEditingMeta(false);
  };

  const handleSetFollowUp = async () => {
    if (!fuDate) return;
    await rescheduleFollowUp(lead.id, new Date(fuDate).toISOString());
    setFuDate('');
  };

  const handleAutoFollowUp = async () => {
    const inferred = inferFollowUpFromFeedback(lead.notes || lead.follow_up_note, lead.status);
    await rescheduleFollowUp(lead.id, inferred.date, null, inferred.note);
  };

  const handleDisposition = async (value) => {
    const updates = { disposition: value };
    if (['wrong_inquiry', 'not_interested', 'unreachable'].includes(value)) {
      updates.status = STAGES.LOST;
    } else if (value === 'npc') {
      updates.status = STAGES.NPC_RETRY;
    }
    await updateLead(lead.id, updates);
  };

  return (
    <div className="space-y-5">
      {/* AI Decision Box */}
      {ai?.nba && (
        <div className="ai-insight">
          <div className="ai-label">
            <span className="text-[14px]">🤖</span>
            AI Decision
          </div>
          <p className="ai-text">
            <strong>{ai.nba.icon} {ai.nba.label}</strong>
            {ai.nba.detail && <span className="block mt-1 text-dim text-[12px]">{ai.nba.detail}</span>}
          </p>
        </div>
      )}

      {/* Follow-Up Section */}
      <div className="glass-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <Calendar size={13} /> Follow-Up
          </h4>
          <button
            onClick={handleAutoFollowUp}
            className="text-[10px] font-bold text-blue hover:underline"
          >
            🤖 Auto-schedule
          </button>
        </div>

        {lead.next_follow_up ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-bright mono">
                {new Date(lead.next_follow_up).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              {lead.follow_up_note && (
                <p className="text-[11px] text-dim mt-1">"{lead.follow_up_note}"</p>
              )}
            </div>
            <span className={`text-[10px] font-bold mono ${new Date(lead.next_follow_up) < new Date() ? 'text-rose' : 'text-emerald'}`}>
              {new Date(lead.next_follow_up) < new Date() ? 'OVERDUE' : 'SCHEDULED'}
            </span>
          </div>
        ) : (
          <p className="text-[12px] text-amber font-medium">⚠️ No follow-up scheduled</p>
        )}

        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={fuDate}
            onChange={e => setFuDate(e.target.value)}
            className="input-v2 flex-1 text-[12px]"
          />
          <button onClick={handleSetFollowUp} className="action-btn primary text-[11px]" disabled={!fuDate}>
            Set
          </button>
        </div>
      </div>

      {/* Quick Dispositions */}
      <div className="glass-sm p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost">Quick Disposition</h4>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DISPOSITIONS.map(d => (
            <button
              key={d.value}
              onClick={() => handleDisposition(d.value)}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-all ${lead.disposition === d.value ? 'ring-1 ring-blue' : ''}`}
              style={{
                background: lead.disposition === d.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-raised)',
                border: '1px solid var(--border-default)',
                color: lead.disposition === d.value ? 'var(--accent-blue)' : 'var(--text-tertiary)',
              }}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lead Profile */}
      <div className="glass-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <User size={13} /> Lead Profile
          </h4>
          <button
            onClick={() => setIsEditingMeta(!isEditingMeta)}
            className="text-[10px] font-bold text-blue hover:underline"
          >
            {isEditingMeta ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditingMeta ? (
          <div className="space-y-2">
            <input
              className="input-v2 text-[12px]"
              placeholder="City"
              value={metaForm.city}
              onChange={e => setMetaForm(p => ({ ...p, city: e.target.value }))}
            />
            <input
              className="input-v2 text-[12px]"
              placeholder="Capital (e.g., 5L, 2 lakh)"
              value={metaForm.capital}
              onChange={e => setMetaForm(p => ({ ...p, capital: e.target.value }))}
            />
            <select
              className="input-v2 text-[12px]"
              value={metaForm.broker}
              onChange={e => setMetaForm(p => ({ ...p, broker: e.target.value }))}
            >
              <option value="">Select Broker</option>
              {BROKERS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select
              className="input-v2 text-[12px]"
              value={metaForm.trading_experience}
              onChange={e => setMetaForm(p => ({ ...p, trading_experience: e.target.value }))}
            >
              <option value="">Trading Experience</option>
              {TRADING_EXPERIENCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={saveMeta} className="action-btn primary w-full justify-center">Save</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'City', value: lead.city, icon: MapPin },
              { label: 'Capital', value: lead.capital, icon: IndianRupee },
              { label: 'Broker', value: lead.broker, icon: Building },
              { label: 'Experience', value: lead.trading_experience, icon: Award },
              { label: 'Source', value: lead.source, icon: User },
              { label: 'Lead Type', value: lead.lead_type, icon: ShieldAlert },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2">
                  <Icon size={13} className="text-ghost mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] text-ghost uppercase tracking-wider">{item.label}</p>
                    <p className="text-[12px] text-muted font-medium">{item.value || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="glass-sm p-4 space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
          <Clock size={13} /> Timestamps
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-ghost">Created</span>
            <p className="text-dim mono">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <span className="text-ghost">Enquiry</span>
            <p className="text-dim mono">{lead.enquiry_date ? new Date(lead.enquiry_date).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <span className="text-ghost">Last Activity</span>
            <p className="text-dim mono">{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <span className="text-ghost">First Contact</span>
            <p className="text-dim mono">{lead.first_contact_at ? new Date(lead.first_contact_at).toLocaleDateString('en-IN') : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
