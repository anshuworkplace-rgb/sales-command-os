import { useMemo } from 'react';
import { Phone, MessageCircle, Calendar, ChevronRight, Clock, MapPin, IndianRupee } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import { STAGE_LABELS, MESSAGE_TEMPLATES, STAGES } from '../../utils/constants';
import { TRIAGE_META } from '../../engines/aiDecisionEngine';
import { formatPhoneDisplay } from '../../services/sheetsSync';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function followUpCountdown(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr).getTime() - Date.now()) / 1000;
  if (diff < 0) {
    const abs = Math.abs(diff);
    if (abs < 3600) return { text: `${Math.floor(abs / 60)}m overdue`, overdue: true };
    if (abs < 86400) return { text: `${Math.floor(abs / 3600)}h overdue`, overdue: true };
    return { text: `${Math.floor(abs / 86400)}d overdue`, overdue: true };
  }
  if (diff < 3600) return { text: `in ${Math.floor(diff / 60)}m`, overdue: false };
  if (diff < 86400) return { text: `in ${Math.floor(diff / 3600)}h`, overdue: false };
  return { text: `in ${Math.floor(diff / 86400)}d`, overdue: false };
}

export default function LeadCard({ lead, onClick }) {
  const { changeStage, rescheduleFollowUp } = useLeadStore();
  const ai = lead._ai;
  const triageMeta = ai?.triageMeta || TRIAGE_META.needs_qualification;
  const nba = ai?.nba;
  const tag = ai?.priorityTag;

  const countdown = followUpCountdown(lead.next_follow_up);

  const phoneClean = lead.phone?.replace(/[^\d]/g, '');
  const callLink = `tel:+91${phoneClean}`;
  const waTemplate = MESSAGE_TEMPLATES[lead.status];
  const waLink = waTemplate
    ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(waTemplate.template(lead.name || 'there'))}`
    : `https://wa.me/91${phoneClean}`;

  const handleAction = (e, actionType) => {
    e.stopPropagation();
    if (actionType === 'call') {
      window.open(callLink, '_self');
    } else if (actionType === 'whatsapp') {
      window.open(waLink, '_blank');
    }
  };

  return (
    <div
      onClick={onClick}
      className={`lead-card ${triageMeta.bgClass} ${tag?.label === 'CRITICAL' ? 'priority-critical' : tag?.label === 'URGENT' ? 'priority-urgent' : ''}`}
    >
      {/* Top row: Priority + Name + Triage */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Priority Tag */}
          {tag && tag.label !== 'LOW' && tag.label !== 'NORMAL' && (
            <span
              className={`priority-tag ${tag.label.toLowerCase()}`}
            >
              {tag.label}
            </span>
          )}

          {/* Lead Name */}
          <h3 className="text-[14px] font-bold text-bright truncate">
            {lead.name || 'Unknown'}
          </h3>
        </div>

        {/* Triage Badge */}
        <span className={`triage-badge ${triageMeta.bgClass.replace('triage-', '')}`}>
          {triageMeta.icon} {triageMeta.label}
        </span>
      </div>

      {/* Meta row: Phone, City, Capital, Broker */}
      <div className="flex items-center gap-3 text-[12px] text-dim mb-3 flex-wrap">
        <span className="mono">{formatPhoneDisplay(lead.phone)}</span>
        {lead.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {lead.city}
          </span>
        )}
        {lead.capital && (
          <span className="flex items-center gap-1 font-semibold">
            <IndianRupee size={11} /> {lead.capital}
          </span>
        )}
        {lead.broker && (
          <span className="text-ghost">{lead.broker}</span>
        )}
        <span className="text-ghost ml-auto">{STAGE_LABELS[lead.status] || lead.status}</span>
      </div>

      {/* Feedback line */}
      {(lead.notes || lead.last_feedback || lead.follow_up_note) && (
        <p className="text-[12px] text-muted mb-3 truncate" style={{ maxWidth: '100%' }}>
          "{lead.follow_up_note || lead.last_feedback || lead.notes}"
        </p>
      )}

      {/* AI Recommendation */}
      {nba && (
        <div className="ai-insight mb-3" style={{ padding: '10px 12px' }}>
          <div className="flex items-center gap-2">
            <span className="text-[14px]">{nba.icon}</span>
            <span className="text-[12px] font-bold text-bright">{nba.label}</span>
            {countdown && (
              <span
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold mono"
                style={{ color: countdown.overdue ? 'var(--priority-critical)' : 'var(--text-tertiary)' }}
              >
                <Clock size={10} />
                {countdown.text}
              </span>
            )}
          </div>
          {nba.detail && (
            <p className="text-[11px] text-dim mt-1 leading-relaxed">{nba.detail}</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => handleAction(e, 'call')}
          className="action-btn primary"
        >
          <Phone size={13} /> Call
        </button>
        <button
          onClick={(e) => handleAction(e, 'whatsapp')}
          className="action-btn success"
        >
          <MessageCircle size={13} /> WhatsApp
        </button>
        {['discovery', 'first_call'].includes(lead.status) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Open detail to schedule meet
              onClick?.();
            }}
            className="action-btn"
          >
            <Calendar size={13} /> Meet
          </button>
        )}

        {/* Heat Score */}
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="w-8 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${ai?.heatScore || 0}%`,
                background: (ai?.heatScore || 0) > 70
                  ? 'var(--accent-emerald)'
                  : (ai?.heatScore || 0) > 40
                  ? 'var(--accent-amber)'
                  : 'var(--priority-critical)',
              }}
            />
          </div>
          <span className="text-[9px] mono text-ghost">{ai?.heatScore || 0}</span>
        </div>

        <ChevronRight size={16} className="text-ghost" />
      </div>
    </div>
  );
}
