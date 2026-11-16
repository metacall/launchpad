import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';

interface DeleteModalProps {
  suffix: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

export function DeleteModal({ suffix, onConfirm, onCancel, deleting }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-sm p-4 sm:p-6 flex flex-col gap-5 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-800 text-sm">Delete deployment?</p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-mono font-semibold text-gray-700">{suffix}</span> will be
              permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="min-h-11 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="flex items-center justify-center gap-2 min-h-11 px-4 py-2 text-xs font-semibold border border-gray-300 text-white bg-gray-400 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-60"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <Spinner size={14} /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
