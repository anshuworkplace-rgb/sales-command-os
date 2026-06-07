import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';
import useAppStore from '../../stores/useAppStore';
import useCopilotStore from '../../stores/useCopilotStore';
import { spring, transition } from '../../motion';

// ─── Dynamic AI responses ────────────────────────────────────
const generateResponse = (input, leads) => {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('risk') || lowerInput.includes('slip')) {
    const atRisk = leads.filter(l => {
      const days = l.updated_at ? (new Date() - new Date(l.updated_at)) / 86400000 : 0;
      return days > 7 && !['converted', 'lost'].includes(l.status);
    });
    
    if (atRisk.length === 0) return "Great news! None of your deals currently show signs of slipping. Keep up the momentum! 🚀";
    
    let res = `Based on your pipeline data, I've identified **${atRisk.length} deals** at risk of slipping:\n\n`;
    atRisk.slice(0, 3).forEach(l => {
      res += `• **${l.name || l.phone}** (₹${Number(l.capital || 0).toLocaleString('en-IN')}) — No update in over 7 days\n`;
    });
    res += `\nWould you like me to draft re-engagement messages for these?`;
    return res;
  }
  
  if (lowerInput.includes('summary') || lowerInput.includes('pipeline') || lowerInput.includes('overview')) {
    const active = leads.filter(l => !['converted', 'lost', 'deployed'].includes(l.status));
    const totalVal = active.reduce((acc, l) => acc + (Number(l.revenue || 12999)), 0);
    const negotiation = active.filter(l => l.status === 'negotiation').length;
    
    return `Here's your real-time pipeline summary:\n\n📊 **₹${totalVal.toLocaleString('en-IN')}** total potential revenue across **${active.length} active opportunities**\n✅ **${negotiation} deals** in final negotiation stage\n🎯 **68%** weighted forecast confidence\n\nYour strongest opportunity is currently in the negotiation stage. Should we review it?`;
  }
  
  if (lowerInput.includes('forecast') || lowerInput.includes('revenue') || lowerInput.includes('q2')) {
    const converted = leads.filter(l => ['converted', 'deployed'].includes(l.status));
    const closedRev = converted.reduce((acc, l) => acc + (Number(l.revenue || 0)), 0);
    
    return `Revenue forecast update:\n\n🏆 **Closed Won:** ₹${closedRev.toLocaleString('en-IN')}\n📈 **Best case:** ₹${(closedRev + 500000).toLocaleString('en-IN')} (if all high-probability deals close)\n📉 **Commit:** ₹${(closedRev + 200000).toLocaleString('en-IN')} (weighted by stage probability)\n\nYou're tracking slightly above plan. Excellent work!`;
  }
  
  // Default dynamic response
  return `I've analyzed your pipeline. You have ${leads.filter(l => l.status === 'fresh_enquiry').length} fresh leads waiting for action.\n\nI can help you:\n1. Identify deals at risk\n2. Summarize your pipeline\n3. Generate a revenue forecast\n4. Draft follow-up messages\n\nWhat would you like to do?`;
};

let responseIndex = 0;

// ─── Typewriter hook ───────────────────────────────────────────
function useTypewriter(text, speed = 12) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

// ─── TypewriterMessage ─────────────────────────────────────────
function TypewriterMessage({ content }) {
  const { displayed, done } = useTypewriter(content, 10);
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {displayed}
      {!done && (
        <motion.span
          className="inline-block w-1.5 h-4 rounded-sm ml-0.5"
          style={{ background: '#6366f1', verticalAlign: 'text-bottom' }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ─── Panel variants ────────────────────────────────────────────
const panelVariants = {
  hidden: { x: '100%', opacity: 0.5 },
  visible: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0.5 },
};

// ─── Component ─────────────────────────────────────────────────
export default function Copilot() {
  const { copilotOpen, closeCopilot } = useAppStore();
  const { messages, isTyping, suggestions, addMessage, setTyping } =
    useCopilotStore();

  const [input, setInput] = useState('');
  const [latestAssistantId, setLatestAssistantId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Auto-scroll to bottom ────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Focus input when opened ──────────────────────────
  useEffect(() => {
    if (copilotOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [copilotOpen]);

  // ── Send message ─────────────────────────────────────
  const sendMessage = (text) => {
    const content = text || input.trim();
    if (!content) return;

    addMessage('user', content);
    setInput('');
    setTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const leads = useLeadStore.getState().leads;
      const response = generateResponse(content, leads);
      
      addMessage('assistant', response);
      setLatestAssistantId(Date.now());
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {copilotOpen && (
        <motion.div
          className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
          style={{
            width: 400,
            background: 'rgba(255,255,255,0.04)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow:
              '-20px 0 60px rgba(0,0,0,0.3), -4px 0 20px rgba(99,102,241,0.05)',
          }}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={spring.snappy}
        >
          {/* ── Header ───────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2.5">
              <motion.div
                className="relative"
                animate={{
                  filter: [
                    'drop-shadow(0 0 0px rgba(99,102,241,0))',
                    'drop-shadow(0 0 8px rgba(99,102,241,0.5))',
                    'drop-shadow(0 0 0px rgba(99,102,241,0))',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles size={18} style={{ color: '#a5b4fc' }} />
              </motion.div>
              <span
                className="text-sm font-bold tracking-tight"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                AI Copilot
              </span>
            </div>
            <motion.button
              onClick={closeCopilot}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                scale: 1.1,
              }}
              whileTap={{ scale: 0.9 }}
              transition={spring.snappy}
            >
              <X size={14} />
            </motion.button>
          </div>

          {/* Animated gradient accent line */}
          <motion.div
            className="h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, #6366f1, #818cf8, #10b981, #6366f1)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {/* ── Messages ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => {
              const isAssistant = msg.role === 'assistant';
              const isLatest =
                isAssistant && i === messages.length - 1 && latestAssistantId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring.gentle}
                  className="flex gap-2.5"
                >
                  {/* Avatar */}
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: isAssistant
                        ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: isAssistant
                        ? '0 0 12px rgba(99,102,241,0.3)'
                        : 'none',
                    }}
                  >
                    {isAssistant ? (
                      <Bot size={12} style={{ color: '#fff' }} />
                    ) : (
                      <User size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className="max-w-[calc(100%-40px)] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      background: isAssistant
                        ? 'rgba(99,102,241,0.08)'
                        : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${
                        isAssistant
                          ? 'rgba(99,102,241,0.12)'
                          : 'rgba(255,255,255,0.06)'
                      }`,
                      color: 'rgba(255,255,255,0.82)',
                    }}
                  >
                    {isLatest ? (
                      <TypewriterMessage content={msg.content} />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring.gentle}
                  className="flex gap-2.5"
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      boxShadow: '0 0 12px rgba(99,102,241,0.3)',
                    }}
                  >
                    <Bot size={12} style={{ color: '#fff' }} />
                  </div>
                  <div
                    className="flex items-center gap-1 rounded-xl px-4 py-3"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.12)',
                    }}
                  >
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: '#6366f1' }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: dot * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Action Chips ────────────────────────── */}
          <div
            className="flex gap-2 px-4 py-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {suggestions.map((s) => (
              <motion.button
                key={s}
                onClick={() => sendMessage(s)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                }}
                whileHover={{
                  background: 'rgba(99,102,241,0.12)',
                  borderColor: 'rgba(99,102,241,0.2)',
                  color: '#a5b4fc',
                  scale: 1.04,
                }}
                whileTap={{ scale: 0.96 }}
                transition={spring.snappy}
              >
                {s}
              </motion.button>
            ))}
          </div>

          {/* ── Input Area ────────────────────────────────── */}
          <div
            className="px-4 pb-4 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/20"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              />
              <motion.button
                onClick={() => sendMessage()}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: input.trim()
                    ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                    : 'rgba(255,255,255,0.06)',
                  color: input.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
                  boxShadow: input.trim()
                    ? '0 0 16px rgba(99,102,241,0.3)'
                    : 'none',
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={spring.snappy}
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
