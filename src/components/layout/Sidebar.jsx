import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, LayoutGrid, BarChart3, Settings, Plus, LogOut, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import useLeadStore from '../../stores/useLeadStore';

const NAV_ITEMS = [
  { id: 'command', label: 'Command', icon: Zap, shortcut: '1', desc: 'AI-prioritized action queue' },
  { id: 'pipeline', label: 'Pipeline', icon: LayoutGrid, shortcut: '2', desc: 'All leads database' },
  { id: 'pulse', label: 'Pulse', icon: BarChart3, shortcut: '3', desc: 'Analytics & revenue' },
];

const NAV_SECONDARY = [
  { id: 'sheets', label: 'Sheets Sync', icon: FileSpreadsheet },
];

export default function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar, openAddLead } = useUIStore();
  const { getCurrentUser, signOut } = useUserStore();
  const { leads } = useLeadStore();
  const user = getCurrentUser();

  const badges = useMemo(() => {
    if (!user) return {};
    const now = new Date();
    const myLeads = leads.filter(l => l.assigned_to === user.id);
    const active = myLeads.filter(l => !['converted', 'deployed', 'lost'].includes(l.status));

    const overdue = active.filter(l =>
      l.next_follow_up && new Date(l.next_follow_up) < now
    ).length;

    const fresh = active.filter(l =>
      ['fresh_enquiry', 'new'].includes(l.status)
    ).length;

    return {
      command: overdue + fresh || null,
      pipeline: active.length || null,
    };
  }, [leads, user]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar-v2 hidden lg:flex ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            }}>
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && (
            <div className="leading-tight overflow-hidden">
              <h1 className="text-[15px] font-extrabold tracking-tight text-bright">
                Sales<span className="text-blue">OS</span>
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-ghost font-semibold">
                v2 · Command
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: 'var(--border-subtle)' }} />

        {/* Quick Add */}
        <div className="px-3 py-3">
          <button
            onClick={() => openAddLead()}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-[11px] transition-all active:scale-[0.97] ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
              border: '1px solid rgba(59,130,246,0.25)',
              color: 'var(--accent-blue)',
            }}
            title="Quick Add (⌘.)"
          >
            <Plus size={14} strokeWidth={3} />
            {!sidebarCollapsed && <span className="uppercase tracking-wider">New Lead</span>}
          </button>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-1 py-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const badge = badges[item.id];
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`nav-item w-full ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? `${item.label} (${item.shortcut})` : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {!sidebarCollapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {badge && <span className="nav-badge">{badge}</span>}
                  </>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="mx-3 my-3 h-px" style={{ background: 'var(--border-subtle)' }} />

          {NAV_SECONDARY.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`nav-item w-full ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-3 py-2">
          <button
            onClick={toggleSidebar}
            className="nav-item w-full"
            style={{ justifyContent: sidebarCollapsed ? 'center' : undefined }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!sidebarCollapsed && <span className="nav-label text-[11px]">Collapse</span>}
          </button>
        </div>

        {/* User Section */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg flex-center text-sm flex-shrink-0"
              style={{ background: user?.color || 'var(--accent-blue)', color: 'white', fontWeight: 700 }}>
              {user?.avatar || user?.name?.[0] || '?'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-bright truncate">{user?.name || 'User'}</div>
                <div className="text-[10px] text-ghost uppercase tracking-wider">{user?.role || 'sales'}</div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={signOut}
                className="p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
                title="Sign Out"
              >
                <LogOut size={14} className="text-ghost" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => openAddLead()}
          className="mobile-nav-item"
        >
          <Plus size={20} strokeWidth={2} />
          <span>Add</span>
        </button>
      </nav>
    </>
  );
}
