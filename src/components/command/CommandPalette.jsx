import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  GitBranch,
  Users,
  Shield,
  BarChart3,
  Crown,
  Sparkles,
  FileText,
  Mail,
  AlertTriangle,
  PlusCircle,
  UserPlus,
  Swords,
  Calendar,
  ArrowRight,
  Command,
} from 'lucide-react';
import useAppStore from '../../stores/useAppStore';
import useUIStore from '../../stores/useUIStore';
import { spring, transition, scaleIn } from '../../motion';

// ─── Command definitions ───────────────────────────────────────
const COMMANDS = [
  // Navigation
  { id: 'nav-mc',   group: 'Navigation', label: 'Go to Mission Control', icon: LayoutDashboard, action: 'navigate', view: 'mission-control', shortcut: '⌘1' },
  { id: 'nav-pipe', group: 'Navigation', label: 'Go to Pipeline',        icon: GitBranch,       action: 'navigate', view: 'pipeline',        shortcut: '⌘2' },
  { id: 'nav-rel',  group: 'Navigation', label: 'Go to Relationships',   icon: Users,           action: 'navigate', view: 'relationships',   shortcut: '⌘3' },
  { id: 'nav-war',  group: 'Navigation', label: 'Go to War Rooms',       icon: Shield,          action: 'navigate', view: 'war-room',        shortcut: '⌘4' },
  { id: 'nav-ana',  group: 'Navigation', label: 'Go to Analytics',       icon: BarChart3,       action: 'navigate', view: 'analytics',       shortcut: '⌘5' },
  { id: 'nav-exec', group: 'Navigation', label: 'Go to Executive',       icon: Crown,           action: 'navigate', view: 'executive',       shortcut: '⌘6' },

  // AI Actions
  { id: 'ai-ask',      group: 'AI Actions', label: 'Ask Copilot',        icon: Sparkles,      description: 'Open AI assistant' },
  { id: 'ai-summary',  group: 'AI Actions', label: 'Summarize Pipeline', icon: FileText,      description: 'AI-generated pipeline summary' },
  { id: 'ai-email',    group: 'AI Actions', label: 'Generate Email',     icon: Mail,          description: 'Draft a follow-up email' },
  { id: 'ai-risk',     group: 'AI Actions', label: 'Analyze Risks',      icon: AlertTriangle, description: 'Identify at-risk deals' },

  // Quick Actions
  { id: 'qa-deal',     group: 'Quick Actions', label: 'New Deal',         icon: PlusCircle },
  { id: 'qa-contact',  group: 'Quick Actions', label: 'New Contact',      icon: UserPlus },
  { id: 'qa-warroom',  group: 'Quick Actions', label: 'Create War Room',  icon: Swords },
  { id: 'qa-meeting',  group: 'Quick Actions', label: 'Schedule Meeting', icon: Calendar },
];

// ─── Fuzzy match ───────────────────────────────────────────────
function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return true;

  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─── Backdrop variants ────────────────────────────────────────
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: -20, filter: 'blur(8px)' },
  visible: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' },
};

// ─── Component ─────────────────────────────────────────────────
export default function CommandPalette() {
  const {
    commandPaletteOpen,
    toggleCommandPalette,
    closeCommandPalette,
    setView,
    toggleCopilot,
  } = useAppStore();

  const { openAddLead } = useUIStore(); // Added to trigger UI actions

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // ── Filtered commands ────────────────────────────────
  const filtered = useMemo(
    () => COMMANDS.filter((cmd) => fuzzyMatch(cmd.label, query)),
    [query]
  );

  // ── Group filtered ───────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((cmd) => {
      if (!map[cmd.group]) map[cmd.group] = [];
      map[cmd.group].push(cmd);
    });
    return map;
  }, [filtered]);

  // ── Keyboard shortcut to open ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  // ── Focus input when opened ──────────────────────────
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandPaletteOpen]);

  // ── Execute command ──────────────────────────────────
  const executeCommand = useCallback(
    (cmd) => {
      if (cmd.action === 'navigate' && cmd.view) {
        setView(cmd.view);
      } else if (cmd.id === 'ai-ask') {
        toggleCopilot();
      } else if (cmd.id === 'qa-deal') {
        openAddLead();
      }
      closeCommandPalette();
    },
    [setView, closeCommandPalette, toggleCopilot, openAddLead]
  );

  // ── Keyboard navigation ──────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    },
    [filtered, selectedIndex, closeCommandPalette, executeCommand]
  );

  // ── Keep selected item in view ───────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Reset selection on query change ──────────────────
  useEffect(() => setSelectedIndex(0), [query]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transition.fast}
          onKeyDown={handleKeyDown}
        >
          {/* ── Backdrop ─────────────────────────────────── */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={closeCommandPalette}
          />

          {/* ── Modal ────────────────────────────────────── */}
          <motion.div
            className="relative w-full max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow:
                '0 0 60px rgba(99,102,241,0.12), 0 25px 60px rgba(0,0,0,0.4)',
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={spring.snappy}
          >
            {/* ── Search Input ───────────────────────────── */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Search
                size={20}
                style={{ color: 'rgba(255,255,255,0.3)', minWidth: 20 }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-base font-medium outline-none placeholder:text-white/25"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              />
              <kbd
                className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                ESC
              </kbd>
            </div>

            {/* ── Command List ───────────────────────────── */}
            <div
              ref={listRef}
              className="max-h-[340px] overflow-y-auto py-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {Object.keys(grouped).length === 0 && (
                <div
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  No commands found
                </div>
              )}

              {Object.entries(grouped).map(([group, cmds]) => (
                <div key={group}>
                  {/* Group header */}
                  <div
                    className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {group}
                  </div>

                  {cmds.map((cmd) => {
                    flatIndex++;
                    const thisIndex = flatIndex;
                    const isSelected = selectedIndex === thisIndex;
                    const Icon = cmd.icon;

                    return (
                      <motion.button
                        key={cmd.id}
                        data-index={thisIndex}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(thisIndex)}
                        className="relative flex w-full items-center gap-3 px-5 py-2.5 text-left outline-none"
                        animate={{
                          background: isSelected
                            ? 'rgba(99,102,241,0.12)'
                            : 'transparent',
                        }}
                        transition={transition.fast}
                      >
                        {/* Selection glow */}
                        {isSelected && (
                          <motion.span
                            layoutId="cmd-highlight"
                            className="absolute inset-x-2 inset-y-0 rounded-lg"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              boxShadow:
                                '0 0 24px rgba(99,102,241,0.08)',
                            }}
                            transition={spring.snappy}
                          />
                        )}

                        <Icon
                          size={16}
                          className="relative z-10"
                          style={{
                            color: isSelected
                              ? '#a5b4fc'
                              : 'rgba(255,255,255,0.35)',
                            minWidth: 16,
                          }}
                        />

                        <div className="relative z-10 flex-1 min-w-0">
                          <span
                            className="text-[13px] font-semibold"
                            style={{
                              color: isSelected
                                ? 'rgba(255,255,255,0.95)'
                                : 'rgba(255,255,255,0.6)',
                            }}
                          >
                            {cmd.label}
                          </span>
                          {cmd.description && (
                            <span
                              className="ml-2 text-[11px]"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                              {cmd.description}
                            </span>
                          )}
                        </div>

                        {cmd.shortcut && (
                          <kbd
                            className="relative z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: 'rgba(255,255,255,0.3)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}

                        {isSelected && (
                          <ArrowRight
                            size={12}
                            className="relative z-10"
                            style={{ color: '#6366f1' }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Footer ─────────────────────────────────── */}
            <div
              className="flex items-center gap-4 px-5 py-3 text-[11px] font-medium"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  ↵
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  esc
                </kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
