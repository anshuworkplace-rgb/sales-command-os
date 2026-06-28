import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Auth from './components/auth/Auth';
import AddLeadModal from './components/leads/AddLeadModal';
import ImportModal from './components/leads/ImportModal';
import CommandPalette from './components/common/CommandPalette';
import KeyboardShortcutsOverlay from './components/common/KeyboardShortcutsOverlay';
import ToastProvider from './components/common/ToastProvider';
import AICommandBar from './components/ai-bar/AICommandBar';
import LeadDrawer from './components/lead-drawer/LeadDrawer';
import useUserStore from './stores/useUserStore';
import useLeadStore from './stores/useLeadStore';
import useUIStore from './stores/useUIStore';
import useRealtime from './hooks/useRealtime';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useFollowUpReminders from './hooks/useFollowUpReminders';
import { Zap } from 'lucide-react';
import { requestNotificationPermission } from './utils/sounds';

// ── Page Components (3 core views) ──
import CommandFeed from './components/command-feed/CommandFeed';
import PipelineView from './components/pipeline/PipelineView';
import PulseDashboard from './components/pulse/PulseDashboard';
import SheetsView from './components/sheets/SheetsView';

// ── Page transition ──
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

function App() {
  const { session, getCurrentUser } = useUserStore();
  const { fetchData } = useLeadStore();
  const { activePage, sidebarCollapsed } = useUIStore();

  useRealtime();
  useKeyboardShortcuts();
  useFollowUpReminders();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (session && currentUser) {
      fetchData();
      requestNotificationPermission();
    }
  }, [session, currentUser, fetchData]);

  if (!session) return <Auth />;

  const storeError = useUserStore.getState().error;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: 'var(--bg-void)' }}>
        <div className="w-14 h-14 rounded-2xl flex-center animate-breathe"
          style={{
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}>
          <Zap size={24} className="text-white" />
        </div>
        <div className="text-ghost text-[12px] mono uppercase tracking-widest">
          Initializing SalesOS v2...
        </div>
        <div className="w-64 space-y-3 mt-4">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        </div>
        {storeError && (
          <div className="p-4 rounded-xl max-w-md text-center text-sm"
            style={{ border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.08)', color: 'var(--accent-rose)' }}>
            Error: {storeError}
            <br /><br />
            <button
              onClick={() => useUserStore.getState().signOut()}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' }}
            >
              Sign Out & Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'command': return <CommandFeed />;
      case 'pipeline': return <PipelineView />;
      case 'pulse': return <PulseDashboard />;
      case 'sheets': return <SheetsView />;
      // Legacy redirects
      case 'home': return <CommandFeed />;
      case 'action-hub': return <CommandFeed />;
      case 'today': return <CommandFeed />;
      case 'clients': return <PipelineView />;
      case 'revenue': return <PulseDashboard />;
      case 'intelligence': return <CommandFeed />;
      case 'leaderboard': return <PulseDashboard />;
      case 'focus': return <CommandFeed />;
      default: return <CommandFeed />;
    }
  };

  const mainMargin = sidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[220px]';

  return (
    <div className="app-shell">
      <Sidebar />

      <div className={`app-main ${mainMargin}`}>
        <TopBar />

        <main className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Overlays */}
      <LeadDrawer />
      <AddLeadModal />
      <ImportModal />
      <CommandPalette />
      <KeyboardShortcutsOverlay />
      <AICommandBar />
      <ToastProvider />
    </div>
  );
}

export default App;
