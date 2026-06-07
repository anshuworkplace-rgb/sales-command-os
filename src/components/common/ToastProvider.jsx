import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import useToastStore from '../../stores/useToastStore';

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', text: '#34d399' },
  warning: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', text: '#fbbf24' },
  error: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', text: '#f87171' },
  info: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', text: '#60a5fa' },
};

export default function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;
  const colors = COLORS[toast.type] || COLORS.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`toast-item toast-${toast.type} overflow-hidden`}
      style={{ 
        background: 'rgba(14, 18, 30, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${colors.border}40`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div className="flex items-start gap-3 relative z-10">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: colors.bg }}
        >
          <Icon size={14} style={{ color: colors.text }} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="text-[12px] font-bold text-tx-bright mb-0.5">{toast.title}</div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {toast.message}
            </div>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action.onClick();
                  onDismiss();
                }}
                className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-white/10 hover:bg-white/20 text-tx-bright border border-white/10 transition uppercase tracking-wider shrink-0"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-tx-ghost hover:text-tx-dim transition"
        >
          <X size={12} />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-xl"
        style={{ background: colors.border }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}
