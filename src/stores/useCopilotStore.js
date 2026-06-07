import { create } from 'zustand';

let msgId = 1;
const id = () => `msg-${msgId++}`;

const useCopilotStore = create((set, get) => ({
  messages: [
    {
      id: id(),
      role: 'assistant',
      content:
        'Good morning. Your pipeline has $2.4M in active opportunities. 3 deals need attention today. How can I help?',
      timestamp: new Date().toISOString(),
    },
  ],

  isTyping: false,

  suggestions: [
    'Summarize deals',
    'Draft follow-up',
    'Risk analysis',
    'Forecast',
  ],

  // ─── Actions ─────────────────────────────────────────────
  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: id(), role, content, timestamp: new Date().toISOString() },
      ],
    })),

  setTyping: (v) => set({ isTyping: v }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: id(),
          role: 'assistant',
          content:
            'Good morning. Your pipeline has $2.4M in active opportunities. 3 deals need attention today. How can I help?',
          timestamp: new Date().toISOString(),
        },
      ],
    }),
}));

export default useCopilotStore;
