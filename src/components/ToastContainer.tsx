import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastMessage } from '../types/library';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((toast) => {
        const styles = {
          success: {
            border: 'border-emerald-200 bg-white',
            iconColor: 'text-emerald-600',
            Icon: CheckCircle2,
          },
          error: {
            border: 'border-red-200 bg-white',
            iconColor: 'text-red-600',
            Icon: XCircle,
          },
          warning: {
            border: 'border-amber-200 bg-white',
            iconColor: 'text-amber-600',
            Icon: AlertTriangle,
          },
          info: {
            border: 'border-blue-200 bg-white',
            iconColor: 'text-blue-600',
            Icon: Info,
          },
        }[toast.type];

        const IconComponent = styles.Icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border ${styles.border} p-3.5 shadow-lg transition-all duration-200`}
          >
            <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Đóng thông báo"
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
