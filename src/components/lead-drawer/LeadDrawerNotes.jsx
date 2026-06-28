import { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';

export default function LeadDrawerNotes({ lead }) {
  const { addNote, updateLead } = useLeadStore();
  const [newNote, setNewNote] = useState('');
  const [feedbackEdit, setFeedbackEdit] = useState(lead?.notes || '');
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(lead.id, newNote.trim());
    setNewNote('');
  };

  const handleSaveFeedback = async () => {
    await updateLead(lead.id, { notes: feedbackEdit });
    setIsEditingFeedback(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <div className="space-y-5">
      {/* Sheet Feedback / Notes */}
      <div className="glass-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <FileText size={13} /> Sheet Feedback
          </h4>
          <button
            onClick={() => setIsEditingFeedback(!isEditingFeedback)}
            className="text-[10px] font-bold text-blue hover:underline"
          >
            {isEditingFeedback ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditingFeedback ? (
          <div className="space-y-2">
            <textarea
              value={feedbackEdit}
              onChange={e => setFeedbackEdit(e.target.value)}
              className="input-v2 text-[12px] min-h-[80px] resize-y"
              placeholder="Feedback from Google Sheet..."
            />
            <button onClick={handleSaveFeedback} className="action-btn primary text-[11px]">
              Save Feedback
            </button>
          </div>
        ) : (
          <div className="text-[13px] text-muted leading-relaxed" style={{
            background: 'var(--bg-raised)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            {lead.notes || lead.last_feedback || (
              <span className="text-ghost">No feedback recorded</span>
            )}
          </div>
        )}
      </div>

      {/* Follow-Up Note */}
      {lead.follow_up_note && (
        <div className="glass-sm p-4 space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost">📝 Follow-Up Note</h4>
          <p className="text-[13px] text-muted leading-relaxed">"{lead.follow_up_note}"</p>
        </div>
      )}

      {/* Add Quick Note */}
      <div className="glass-sm p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost">✍️ Add Note</h4>
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-v2 text-[12px] flex-1 min-h-[44px] resize-none"
            placeholder="Type a note... (Enter to send)"
            rows={2}
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="action-btn primary self-end"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Quick Note Templates */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-ghost uppercase tracking-wider">Quick Notes</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Called, no answer',
            'WhatsApp sent',
            'Interested, will call back',
            'Not interested',
            'Busy, try tomorrow',
            'Demo scheduled',
            'Demo done, positive',
            'Negotiating price',
            'Payment pending',
            'Wrong number',
          ].map(template => (
            <button
              key={template}
              onClick={async () => {
                await addNote(lead.id, template);
              }}
              className="text-[10px] px-2.5 py-1.5 rounded-md transition-all hover:bg-white/[0.04]"
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
              }}
            >
              {template}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
