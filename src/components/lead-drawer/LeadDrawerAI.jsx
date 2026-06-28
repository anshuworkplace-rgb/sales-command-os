import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Shield, Target, Loader2 } from 'lucide-react';
import { getGeminiInsight } from '../../engines/aiDecisionEngine';
import { parseHinglishFeedback } from '../../engines/hinglishParser';
import { calculateWinProbability } from '../../engines/salesIntelligence';

const BATTLECARDS = {
  had_losses: { label: 'Loss History', text: "We don't manage your money — you control everything. Our algo runs on YOUR demat, YOUR rules.", color: 'var(--accent-amber)' },
  too_expensive: { label: 'Budget Concern', text: "Start with our Starter plan at ₹4,999/mo. Even 25K capital works with option selling strategies.", color: 'var(--accent-amber)' },
  no_time: { label: 'No Time', text: "That's exactly why algo works — it runs 24/7 automatically. Set it once, monitor from your phone.", color: 'var(--accent-blue)' },
  trust_issues: { label: 'Trust / SEBI', text: "We are SEBI registered. No profit sharing, no account access. Software runs on your own broker.", color: 'var(--accent-emerald)' },
  needs_proof: { label: 'Wants Proof', text: "We'll show you live results in the demo. Also sharing backtested performance reports.", color: 'var(--accent-violet)' },
};

export default function LeadDrawerAI({ lead, ai }) {
  const [geminiInsight, setGeminiInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const winProb = useMemo(() => calculateWinProbability(lead), [lead]);

  const parsed = useMemo(() =>
    parseHinglishFeedback(lead?.notes || '', lead?.follow_up_note || ''),
    [lead?.notes, lead?.follow_up_note]
  );

  const activeObjections = useMemo(() => {
    const fromDb = Array.isArray(lead?.objections_logged) ? lead.objections_logged : [];
    const fromAi = parsed?.objections?.map(o => o.key) || [];
    return [...new Set([...fromDb, ...fromAi])];
  }, [lead?.objections_logged, parsed?.objections]);

  const fetchGeminiInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGeminiInsight(lead);
      setGeminiInsight(result);
    } catch (e) {
      setError('Failed to get AI insight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Win Probability */}
      <div className="glass-sm p-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost mb-3 flex items-center gap-2">
          <Target size={13} /> Win Probability
        </h4>
        <div className="flex items-center gap-3">
          <div className="text-[28px] font-extrabold mono" style={{
            color: winProb >= 60 ? 'var(--accent-emerald)' : winProb >= 30 ? 'var(--accent-amber)' : 'var(--accent-rose)',
          }}>
            {winProb}%
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${winProb}%`,
                  background: winProb >= 60 ? 'var(--accent-emerald)' : winProb >= 30 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Deep Analysis */}
      <div className="glass-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <Sparkles size={13} /> Gemini AI Analysis
          </h4>
          <button
            onClick={fetchGeminiInsight}
            disabled={loading}
            className="action-btn text-[10px]"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && <p className="text-[12px] text-rose">{error}</p>}

        {geminiInsight && (
          <div className="space-y-3">
            {/* Conviction */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                geminiInsight.conviction === 'high' ? 'bg-emerald/10 text-emerald border border-emerald/20' :
                geminiInsight.conviction === 'medium' ? 'bg-amber/10 text-amber border border-amber/20' :
                'bg-rose/10 text-rose border border-rose/20'
              }`}>
                {geminiInsight.conviction} conviction
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                geminiInsight.riskLevel === 'low' ? 'bg-emerald/10 text-emerald border border-emerald/20' :
                geminiInsight.riskLevel === 'medium' ? 'bg-amber/10 text-amber border border-amber/20' :
                'bg-rose/10 text-rose border border-rose/20'
              }`}>
                {geminiInsight.riskLevel} risk
              </span>
            </div>

            {/* Reasoning */}
            <p className="text-[12px] text-muted leading-relaxed">{geminiInsight.reasoning}</p>

            {/* Suggested Action */}
            <div className="ai-insight" style={{ padding: '10px 12px' }}>
              <p className="text-[12px] font-bold text-bright">💡 {geminiInsight.suggestedAction}</p>
            </div>

            {/* Talking Points */}
            {geminiInsight.talkingPoints?.length > 0 && (
              <div>
                <p className="text-[10px] text-ghost uppercase tracking-wider mb-2">Talking Points</p>
                <ul className="space-y-1">
                  {geminiInsight.talkingPoints.map((point, i) => (
                    <li key={i} className="text-[12px] text-dim flex gap-2">
                      <span className="text-blue">•</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-Up Timing */}
            {geminiInsight.followUpTiming && (
              <p className="text-[11px] text-dim">
                <span className="text-ghost">⏰ Follow-up:</span> {geminiInsight.followUpTiming}
              </p>
            )}
          </div>
        )}

        {!geminiInsight && !loading && (
          <p className="text-[12px] text-ghost">Click "Analyze" for deep AI insights powered by Gemini.</p>
        )}
      </div>

      {/* Objection Handling / Battlecards */}
      {activeObjections.length > 0 && (
        <div className="glass-sm p-4 space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <Shield size={13} /> Objection Battlecards
          </h4>
          {activeObjections.map(key => {
            const card = BATTLECARDS[key];
            if (!card) return null;
            return (
              <div key={key} className="p-3 rounded-lg" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: card.color }}>
                  {card.label}
                </p>
                <p className="text-[12px] text-muted leading-relaxed">{card.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Detected Intelligence */}
      {parsed && (parsed.brokers.length > 0 || parsed.experience.length > 0 || parsed.competitors.length > 0) && (
        <div className="glass-sm p-4 space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost">🔍 Detected from Feedback</h4>
          {parsed.brokers.length > 0 && (
            <p className="text-[12px] text-dim">Broker: <span className="text-muted font-medium">{parsed.brokers.join(', ')}</span></p>
          )}
          {parsed.experience.length > 0 && (
            <p className="text-[12px] text-dim">Experience: <span className="text-muted font-medium">{parsed.experience.map(e => e.label).join(', ')}</span></p>
          )}
          {parsed.competitors.length > 0 && (
            <p className="text-[12px] text-dim">Competitor: <span className="text-muted font-medium">{parsed.competitors.map(c => c.label).join(', ')}</span></p>
          )}
        </div>
      )}
    </div>
  );
}
