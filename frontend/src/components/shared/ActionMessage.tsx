import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ActionMessageType = 'success' | 'error' | 'info';

interface ActionMessageProps {
  type: ActionMessageType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<ActionMessageType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function ActionMessage({ type, message, onDismiss, className = '' }: ActionMessageProps) {
  const Icon = icons[type];

  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${styles[type]} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-current">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="rounded p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss message">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
