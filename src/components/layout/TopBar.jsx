import { Search, Bell, Plus, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import useLeadStore from '../../stores/useLeadStore';
import SheetsSyncBadge from '../sheets/SheetsSyncBadge';

export default function TopBar() {
  const { toggleCommandPalette, toggleNotificationCenter, activePage } = useUIStore();
  const { getCurrentUser } = useUserStore();
  const { fetchData } = useLeadStore();
  const user = getCurrentUser();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time IST clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData?.();
    setTimeout(() => setRefreshing(false), 800);
  };

  const PAGE_TITLES = {
    home: 'Home Dashboard',
    'action-hub': 'Action HUB',
    today: 'My Day',
    pipeline: 'Pipeline Board',
    clients: 'All Clients',
    revenue: 'Revenue Command',
    intelligence: 'AI Intelligence',
    leaderboard: 'Leaderboard',
    sheets: 'Google Sheets Sync',
    focus: 'Focus Mode',
    relationships: 'Relationship Hub',
    'mission-control': 'Mission Control',
    'command-center': 'Command Center',
  };

  const getBreadcrumb = () => {
    if (activePage === 'home') return 'Main';
    if (['action-hub', 'clients', 'revenue', 'intelligence', 'focus'].includes(activePage)) return 'Main';
    if (['relationships', 'leaderboard', 'sheets'].includes(activePage)) return 'Team';
    if (['mission-control', 'command-center'].includes(activePage)) return 'Manager';
    return 'Main';
  };

  const formatIST = (date) => {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <header className="h-[64px] bg-void/90 backdrop-blur-xl sticky top-0 z-30 flex items-center px-5 gap-4">
        {/* Breadcrumb & Title */}
        <div className="hidden lg:flex flex-col justify-center min-w-[200px]">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-tx-ghost mb-0.5">
            SalesOS <ChevronRight size={10} /> {getBreadcrumb()}
          </div>
          <h2 className="text-[17px] font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
            {PAGE_TITLES[activePage] || 'Dashboard'}
          </h2>
        </div>

        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-electric to-blue-700 shadow-glow-electric">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-[14px] font-bold font-heading text-tx-bright">
            {PAGE_TITLES[activePage]}
          </span>
        </div>

        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={toggleCommandPalette}
          className="hover-lift flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-electric/30 hover:bg-white/[0.04] transition-all flex-1 max-w-lg group cursor-pointer ml-auto lg:ml-0"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
        >
          <Search size={14} className="text-tx-ghost group-hover:text-electric transition-colors" />
          <span className="text-[12px] font-semibold text-tx-ghost group-hover:text-tx-dim transition-colors hidden sm:inline">
            Search leads, commands, or ask Copilot...
          </span>
          <span className="text-[12px] text-tx-ghost sm:hidden">Search...</span>
          <div className="ml-auto hidden md:flex items-center gap-1.5">
            <kbd className="kbd-badge group-hover:text-electric group-hover:border-electric/20">⌘K</kbd>
          </div>
        </button>

        <div className="flex items-center gap-3 ml-auto">
          {/* IST Clock */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-tx-dim">
              {formatIST(currentTime)} <span className="text-tx-ghost">IST</span>
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg text-tx-ghost hover:text-white hover:bg-white/[0.06] transition-all ${refreshing ? 'animate-spin text-electric' : ''}`}
            title="Refresh Data (R)"
          >
            <RefreshCw size={16} strokeWidth={2.5} />
          </button>

          {/* Sheets Sync Badge */}
          <div className="hidden sm:block">
            <SheetsSyncBadge />
          </div>

          {/* Notifications */}
          <button
            onClick={toggleNotificationCenter}
            className="relative p-2 rounded-lg text-tx-ghost hover:text-white hover:bg-white/[0.06] transition-all"
            title="Notifications"
          >
            <Bell size={18} strokeWidth={2.2} />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-coral border-2 border-void" />
          </button>

          {/* User (mobile only - desktop shows in sidebar) */}
          <div className="lg:hidden flex items-center gap-2 ml-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{
                background: `linear-gradient(135deg, ${user?.color || '#3b82f6'}20, ${user?.color || '#3b82f6'}08)`,
                color: user?.color || '#3b82f6',
                border: `1px solid ${user?.color || '#3b82f6'}25`,
              }}
            >
              {user?.avatar || user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>
      
      {/* Animated gradient divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent sticky top-[64px] z-30" />
    </>
  );
}
