import { Search, Bell } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';

const PAGE_TITLES = {
  command: { title: 'Command Feed', subtitle: 'AI-prioritized actions' },
  pipeline: { title: 'Pipeline', subtitle: 'All leads database' },
  pulse: { title: 'Pulse', subtitle: 'Analytics & revenue' },
  sheets: { title: 'Sheets Sync', subtitle: 'Google Sheets integration' },
};

export default function TopBar() {
  const { activePage, toggleCommandPalette } = useUIStore();
  const pageInfo = PAGE_TITLES[activePage] || PAGE_TITLES.command;

  return (
    <header className="topbar-v2">
      <div>
        <h2 className="topbar-title">{pageInfo.title}</h2>
        <p className="topbar-subtitle">{pageInfo.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Indicator */}
        <div className="live-indicator">
          <span className="live-dot" />
          <span>Live</span>
        </div>

        {/* Search */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-ghost hover:text-dim transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-raised)', color: 'var(--text-ghost)' }}>⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
