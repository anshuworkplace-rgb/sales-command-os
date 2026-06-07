import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Auth from './components/auth/Auth';
import AddLeadModal from './components/leads/AddLeadModal';
import ImportModal from './components/leads/ImportModal';
import CommandPalette from './components/common/CommandPalette';
import KeyboardShortcutsOverlay from './components/common/KeyboardShortcutsOverlay';
import Copilot from './components/copilot/Copilot';
import ToastProvider from './components/common/ToastProvider';
import useUserStore from './stores/useUserStore';
import useLeadStore from './stores/useLeadStore';
import useUIStore from './stores/useUIStore';
import useRealtime from './hooks/useRealtime';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { Zap } from 'lucide-react';
import { requestNotificationPermission } from './utils/sounds';

// ── Page Components ──
import HomeDashboard from './components/dashboard/HomeDashboard';
import ActionHub from './components/dashboard/ActionHub';
import ClientsTable from './components/clients/ClientsTable';
import RevenueDashboard from './components/revenue/RevenueDashboard';
import AIIntelligence from './components/ai/AIIntelligence';
import LeaderboardView from './components/leaderboard/LeaderboardView';
import LeadDetailPanel from './components/leads/LeadDetailPanel';
import SheetsView from './components/sheets/SheetsView';
import FocusMode from './components/focus/FocusMode';
import MissionControl from './components/mission-control/MissionControl';
import CommandCenter from './components/executive/CommandCenter';
import RelationshipHub from './components/relationships/RelationshipHub';

// ── Page transition variants ──
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};

function App() {
  const { session, getCurrentUser } = useUserStore();
  const { fetchData } = useLeadStore();
  const { activePage, sidebarCollapsed } = useUIStore();

  useRealtime();
  useKeyboardShortcuts();
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
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric to-blue-700 flex items-center justify-center shadow-glow-electric animate-pulse">
          <Zap size={24} className="text-white" />
        </div>
        <div className="text-tx-ghost text-[12px] font-mono uppercase tracking-widest">
          Initializing SalesOS...
        </div>
        {/* Loading skeleton preview */}
        <div className="w-80 space-y-3 mt-4">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        </div>
        {storeError && (
          <div className="p-4 border border-coral/30 bg-coral/10 text-coral rounded-xl max-w-md text-center text-sm">
            Error: {storeError}
            <br /><br />
            <button
              onClick={() => useUserStore.getState().signOut()}
              className="px-4 py-2 bg-coral/20 rounded-lg hover:bg-coral/30 text-coral mt-2 text-xs font-bold"
            >
              Sign Out & Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Render active page with key for AnimatePresence ──
  const renderPage = () => {
    const isManager = ['manager', 'admin'].includes(currentUser?.role);

    switch (activePage) {
      case 'home': return <HomeDashboard />;
      case 'action-hub': return <ActionHub />;
      case 'today': return <ActionHub />;
      case 'clients': return <ClientsTable />;
      case 'revenue': return <RevenueDashboard />;
      case 'intelligence': return <AIIntelligence />;
      case 'ai': return <AIIntelligence />;
      case 'leaderboard': return <LeaderboardView />;
      case 'sheets': return <SheetsView />;
      case 'pipeline': return <ClientsTable />;
      case 'focus': return <FocusMode />;
      case 'mission-control': return isManager ? <MissionControl /> : <HomeDashboard />;
      case 'command-center': return isManager ? <CommandCenter /> : <HomeDashboard />;
      case 'relationships': return <RelationshipHub />;
      default: return <HomeDashboard />;
    }
  };

  const mainMargin = sidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[240px]';

  return (
    <div className="min-h-screen bg-void relative">
      {/* Sidebar (desktop) + Bottom Nav (mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`${mainMargin} transition-[margin] duration-300 flex flex-col min-h-screen`}>
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-4">
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
      <LeadDetailPanel />
      <AddLeadModal />
      <ImportModal />
      <CommandPalette />
      <KeyboardShortcutsOverlay />
      <Copilot />
      <ToastProvider />
    </div>
  );
}

export default App;
