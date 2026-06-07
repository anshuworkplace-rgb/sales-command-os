import { useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import useSheetsSyncStore from '../../stores/useSheetsSyncStore';
import useUIStore from '../../stores/useUIStore';

/**
 * Compact sync status badge for the TopBar.
 * Shows: green pulse (synced), amber (syncing), red (error), ghost (idle)
 * Clicking navigates to the Sheets page.
 */
export default function SheetsSyncBadge() {
  const { syncStatus, lastSyncAt, syncEnabled } = useSheetsSyncStore();
  const { setActivePage } = useUIStore();

  if (!syncEnabled) return null;

  const config = useMemo(() => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/15',
          pulse: true,
          label: 'Syncing...',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/15',
          pulse: false,
          label: lastSyncAt
            ? `Synced ${new Date(lastSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : 'Synced',
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/15',
          pulse: false,
          label: 'Sync Error',
        };
      default:
        return {
          icon: FileSpreadsheet,
          color: 'text-tx-ghost',
          bg: 'bg-white/[0.03] border-white/[0.06]',
          pulse: false,
          label: 'Sheets',
        };
    }
  }, [syncStatus, lastSyncAt]);

  const Icon = config.icon;

  return (
    <button
      onClick={() => setActivePage('sheets')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition hover:opacity-80 ${config.bg} ${config.color}`}
      title={config.label}
    >
      <span className="relative flex items-center">
        <Icon size={12} className={config.pulse ? 'animate-spin' : ''} />
        {syncStatus === 'success' && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </span>
      <span className="hidden lg:inline">{config.label}</span>
    </button>
  );
}
