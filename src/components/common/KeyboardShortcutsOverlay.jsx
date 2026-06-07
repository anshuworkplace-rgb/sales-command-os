import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Compass, ListStart, UserCircle } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';

export default function KeyboardShortcutsOverlay() {
  const { isShortcutsOverlayOpen, closeShortcutsOverlay } = useUIStore();

  if (!isShortcutsOverlayOpen) return null;

  const sections = [
    {
      title: 'Global Controls',
      icon: Keyboard,
      color: 'text-electric',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Toggle Command Palette' },
        { keys: ['Ctrl', 'J'], label: 'Toggle AI Copilot' },
        { keys: ['Ctrl', '.'], label: 'Quick Add Lead' },
        { keys: ['?'], label: 'Toggle Keyboard Shortcuts' },
        { keys: ['Esc'], label: 'Close current modal or panel' },
      ],
    },
    {
      title: 'Page Navigation',
      icon: Compass,
      color: 'text-violet',
      items: [
        { keys: ['g', 'h'], label: 'Go to Home Dashboard' },
        { keys: ['g', 'a'], label: 'Go to Action HUB' },
        { keys: ['g', 'c'], label: 'Go to Clients Table' },
        { keys: ['g', 'r'], label: 'Go to Revenue Command' },
        { keys: ['g', 'l'], label: 'Go to Leaderboard' },
        { keys: ['g', 'i'], label: 'Go to AI Intel' },
        { keys: ['g', 'f'], label: 'Go to Focus Mode' },
      ],
    },
    {
      title: 'List Actions',
      icon: ListStart,
      color: 'text-mint',
      items: [
        { keys: ['j'], label: 'Select next lead in priority' },
        { keys: ['k'], label: 'Select previous lead' },
        { keys: ['Enter'], label: 'Open details for selected lead' },
        { keys: ['e'], label: 'Open details for selected lead' },
        { keys: ['c'], label: 'Create new lead' },
        { keys: ['/'], label: 'Focus page search input' },
      ],
    },
    {
      title: 'Lead Profile (Details Panel Open)',
      icon: UserCircle,
      color: 'text-coral',
      items: [
        { keys: ['e'], label: 'Toggle Edit profile fields' },
        { keys: ['n'], label: 'Focus note input field' },
        { keys: ['s'], label: 'Click Reschedule Follow-up' },
        { keys: ['p'], label: 'Click Record Payment' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          onClick={closeShortcutsOverlay}
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-deep/90 p-6 shadow-elevated backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-line mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric/15 text-electric">
                <Keyboard size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-tx-bright tracking-tight">Keyboard Shortcuts</h3>
                <span className="text-[10px] uppercase tracking-wider text-tx-ghost font-semibold">Speed Operations God Mode</span>
              </div>
            </div>
            <button
              onClick={closeShortcutsOverlay}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-tx-ghost transition"
              aria-label="Close cheatsheet"
            >
              <X size={16} />
            </button>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-1">
            {sections.map((section, idx) => {
              const SectionIcon = section.icon;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-tx-bright">
                    <SectionIcon size={14} className={section.color} />
                    <span>{section.title}</span>
                  </div>
                  <div className="space-y-1.5">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-2 text-xs hover:bg-white/[0.04] transition"
                      >
                        <span className="font-semibold text-tx-dim">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              {keyIdx > 0 && <span className="text-[10px] text-tx-ghost font-bold">+</span>}
                              <kbd className="kbd-badge !py-0.5 !px-1.5 font-bold font-mono min-w-[20px] text-center text-tx-bright select-none">
                                {key === 'Ctrl' && navigator.platform.indexOf('Mac') > -1 ? '⌘' : key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-line text-center text-[10px] font-medium text-tx-ghost">
            Press <kbd className="kbd-badge text-[9px] px-1 py-0.5">Esc</kbd> or click anywhere outside to close this help sheet.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
