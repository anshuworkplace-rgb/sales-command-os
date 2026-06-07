import { useMemo } from 'react';
import { motion, AnimateSharedLayout } from 'framer-motion';
import { Home, Zap, Columns3, Users, IndianRupee, Brain, Trophy, ChevronLeft, ChevronRight, Plus, LogOut, Settings, FileSpreadsheet, Target, HeartHandshake, Globe, BarChart3 } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import useLeadStore from '../../stores/useLeadStore';

const ICONS = { Home, Zap, Columns3, Users, IndianRupee, Brain, Trophy, Settings, FileSpreadsheet, Target, HeartHandshake, Globe, BarChart3 };

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'Home', shortcut: '1' },
  { id: 'action-hub', label: 'Action HUB', icon: 'Zap', badge: true, shortcut: '2' },
  { id: 'clients', label: 'All Clients', icon: 'Users', shortcut: '3' },
  { id: 'revenue', label: 'Revenue', icon: 'IndianRupee', shortcut: '4' },
  { id: 'intelligence', label: 'AI Intel', icon: 'Brain', badge: true, shortcut: '6' },
  { id: 'focus', label: 'Focus Mode', icon: 'Target', shortcut: '7' },
];

const NAV_SECONDARY = [
  { id: 'relationships', label: 'Relationships', icon: 'HeartHandshake' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'Trophy', shortcut: '5' },
  { id: 'sheets', label: 'Sheets Sync', icon: 'FileSpreadsheet' },
];

const NAV_MANAGER = [
  { id: 'mission-control', label: 'Mission Control', icon: 'Globe' },
  { id: 'command-center', label: 'Command Center', icon: 'BarChart3' },
];

export default function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar, openAddLead } = useUIStore();
  const { getCurrentUser, signOut } = useUserStore();
  const { leads } = useLeadStore();
  const user = getCurrentUser();
  const isManager = ['manager', 'admin'].includes(user?.role);

  // Calculate badge counts
  const badges = useMemo(() => {
    const now = new Date();
    const myLeads = user ? leads.filter(l => l.assigned_to === user.id) : leads;
    const activeLeads = myLeads.filter(l => !['converted', 'deployed', 'lost'].includes(l.status));

    const overdue = activeLeads.filter(l =>
      l.next_follow_up && new Date(l.next_follow_up) < now
    ).length;

    const todayFollowUps = activeLeads.filter(l => {
      if (!l.next_follow_up) return false;
      const fu = new Date(l.next_follow_up);
      return fu.toDateString() === now.toDateString();
    }).length;

    const noFollowUp = activeLeads.filter(l => !l.next_follow_up).length;

    return {
      today: overdue + todayFollowUps,
      intelligence: overdue + noFollowUp,
      'action-hub': overdue + todayFollowUps,
    };
  }, [leads, user]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar hidden lg:flex ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo Area */}
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-electric to-blue-600 shadow-glow-electric flex-shrink-0 animate-pulse-glow">
            <Zap size={14} className="text-white fill-white/10" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && (
            <div className="leading-tight overflow-hidden">
              <h1 className="text-[15px] font-extrabold font-heading tracking-tight text-tx-glow">
                Sales<span className="text-gradient-electric">OS</span>
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-tx-ghost font-semibold">
                Command Center
              </span>
            </div>
          )}
        </div>

        <div className="divider mx-4" />

        {/* Quick Add */}
        <div className="px-3 py-3">
          <button
            onClick={() => openAddLead()}
            className={`ripple-effect w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-electric/15 to-blue-600/10 border border-electric/30 text-electric font-black text-[11px] hover:from-electric/25 hover:to-blue-600/20 hover:border-electric/50 hover:shadow-glow-electric/15 transition-all active:scale-[0.97] ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
            title="Quick Add (⌘.)"
          >
            <Plus size={14} strokeWidth={3} className="text-electric" />
            {!sidebarCollapsed && <span className="uppercase tracking-wider">New Lead</span>}
          </button>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-1.5 py-1 space-y-0.5 overflow-y-auto no-scrollbar">
          <div className="px-3 py-2">
            {!sidebarCollapsed && (
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-tx-ghost">
                Main
              </span>
            )}
          </div>
          
          {NAV_ITEMS.map(item => {
            const Icon = ICONS[item.icon];
            const isActive = activePage === item.id;
            const badgeCount = item.badge ? badges[item.id] : 0;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`relative group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  isActive ? 'text-tx-bright' : 'text-tx-dim hover:text-tx-bright hover:bg-white/[0.04]'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={sidebarCollapsed ? `${item.label} (${item.shortcut})` : ''}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-electric/10 border border-electric/20 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={`flex-shrink-0 relative z-10 ${isActive ? 'text-electric' : ''}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left relative z-10">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="notif-badge relative z-10">{badgeCount}</span>
                    )}
                    {item.shortcut && (
                      <span className="kbd-badge opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">{item.shortcut}</span>
                    )}
                  </>
                )}
                {sidebarCollapsed && badgeCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-coral shadow-glow-coral z-10" />
                )}
              </button>
            );
          })}

          <div className="divider mx-3 my-3" />

          {!sidebarCollapsed && (
            <div className="px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-tx-ghost">
                Team
              </span>
            </div>
          )}
          {NAV_SECONDARY.map(item => {
            const Icon = ICONS[item.icon];
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`relative group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  isActive ? 'text-tx-bright' : 'text-tx-dim hover:text-tx-bright hover:bg-white/[0.04]'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-electric/10 border border-electric/20 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={`flex-shrink-0 relative z-10 ${isActive ? 'text-electric' : ''}`} />
                {!sidebarCollapsed && <span className="flex-1 text-left relative z-10">{item.label}</span>}
              </button>
            );
          })}

          {isManager && (
            <>
              <div className="divider mx-3 my-3" />
              {!sidebarCollapsed && (
                <div className="px-3 py-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-tx-ghost">
                    Manager
                  </span>
                </div>
              )}
              {NAV_MANAGER.map(item => {
                const Icon = ICONS[item.icon];
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`relative group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                      isActive ? 'text-tx-bright' : 'text-tx-dim hover:text-tx-bright hover:bg-white/[0.04]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-electric/10 border border-electric/20 rounded-xl"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={`flex-shrink-0 relative z-10 ${isActive ? 'text-electric' : ''}`} />
                    {!sidebarCollapsed && <span className="flex-1 text-left relative z-10">{item.label}</span>}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Version Badge */}
        {!sidebarCollapsed && (
          <div className="px-5 py-2 text-center">
            <span className="text-[10px] font-mono text-tx-ghost">SalesOS v2.0 · Pro</span>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="px-3 py-2 border-t border-white/[0.05]">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg text-tx-ghost hover:text-tx-dim hover:bg-white/[0.03] transition"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User Section */}
        <div className={`border-t border-white/[0.05] p-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 relative ${sidebarCollapsed ? '' : ''}`}>
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${user?.color || '#3b82f6'}20, ${user?.color || '#3b82f6'}08)`,
                  color: user?.color || '#3b82f6',
                  border: `1px solid ${user?.color || '#3b82f6'}25`,
                }}
              >
                {user?.avatar || user?.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-void rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-mint rounded-full live-pulse" />
              </div>
            </div>
            
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-tx-bright truncate">{user?.name}</div>
                <div className="text-[10px] text-tx-ghost capitalize">{user?.role}</div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-tx-ghost hover:text-coral transition"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav lg:hidden">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = ICONS[item.icon];
          const isActive = activePage === item.id;
          const badgeCount = item.badge ? badges[item.id] : 0;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-electric' : 'text-tx-ghost'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[9px] font-semibold">{item.label}</span>
              {badgeCount > 0 && (
                <span className="absolute -top-0.5 right-0 w-4 h-4 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center shadow-glow-coral">
                  {badgeCount}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute -bottom-1.5 w-5 h-[2px] rounded-full bg-electric shadow-glow-electric"
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
