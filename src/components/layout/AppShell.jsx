import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'lucide-react';
import useAppStore from '../../stores/useAppStore';
import Sidebar from './Sidebar';
import CommandPalette from '../command/CommandPalette';
import Copilot from '../copilot/Copilot';
import { spring, pageTransition } from '../../motion';

// ─── Placeholder view components ─────────────────────────────────
// These will be replaced with real implementations later.
const PlaceholderView = ({ title, accent }) => (
  <div className="flex h-full min-h-[70vh] items-center justify-center">
    <div className="text-center">
      <motion.h1
        className="text-4xl font-extrabold tracking-tight"
        style={{ color: 'rgba(255,255,255,0.88)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        {title}
      </motion.h1>
      <motion.div
        className="mx-auto mt-4 h-1 w-16 rounded-full"
        style={{ background: accent }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ ...spring.snappy, delay: 0.15 }}
      />
      <motion.p
        className="mt-4 text-sm"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        This module is loading…
      </motion.p>
    </div>
  </div>
);

const MissionControl     = () => <PlaceholderView title="Mission Control" accent="#6366f1" />;
const PipelineEngine     = () => <PlaceholderView title="Pipeline Engine" accent="#10b981" />;
const RelationshipHub    = () => <PlaceholderView title="Relationship Hub" accent="#818cf8" />;
const WarRoom            = () => <PlaceholderView title="War Rooms" accent="#f59e0b" />;
const CinematicAnalytics = () => <PlaceholderView title="Analytics" accent="#6366f1" />;
const CommandCenter      = () => <PlaceholderView title="Executive Command" accent="#f59e0b" />;

const VIEW_MAP = {
  'mission-control': MissionControl,
  pipeline:          PipelineEngine,
  relationships:     RelationshipHub,
  'war-room':        WarRoom,
  analytics:         CinematicAnalytics,
  executive:         CommandCenter,
};

// ─── AppShell ────────────────────────────────────────────────────
export default function AppShell() {
  const { currentView, sidebarCollapsed, toggleCommandPalette } = useAppStore();
  const ActiveView = VIEW_MAP[currentView] || MissionControl;

  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  return (
    <div
      className="relative flex min-h-screen"
      style={{ background: '#09090b' }}
    >
      {/* ── Sidebar ──────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Content ─────────────────────────────────── */}
      <motion.main
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: '100vh' }}
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={spring.snappy}
      >
        {/* Ambient background glow */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 10% 10%, rgba(99,102,241,0.06), transparent 60%),
              radial-gradient(ellipse 40% 40% at 90% 80%, rgba(16,185,129,0.03), transparent 60%)
            `,
            zIndex: 0,
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Floating CMD+K Button ──────────────────────── */}
        <motion.button
          onClick={toggleCommandPalette}
          className="fixed top-4 right-6 z-30 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'rgba(255,255,255,0.45)',
          }}
          whileHover={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            scale: 1.03,
            boxShadow: '0 0 20px rgba(99,102,241,0.15)',
          }}
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
        >
          <Command size={14} />
          <span className="text-xs font-medium">⌘K</span>
        </motion.button>
      </motion.main>

      {/* ── Overlays ─────────────────────────────────────── */}
      <CommandPalette />
      <Copilot />
    </div>
  );
}
