import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/10 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/10 text-white';
      default:
        return 'bg-zinc-100 hover:bg-white text-zinc-950';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className={`p-3 rounded-xl mb-4 border ${
            type === 'danger' 
              ? 'bg-rose-500/5 text-rose-400 border-rose-500/10' 
              : type === 'warning' 
                ? 'bg-amber-500/5 text-amber-400 border-amber-500/10'
                : 'bg-zinc-500/5 text-zinc-400 border-zinc-800'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-zinc-100 tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed px-2">{message}</p>
        </div>

        <div className="flex gap-3 pt-2 border-t border-zinc-800/60">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl bg-transparent hover:bg-zinc-800/50 transition border border-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${getButtonColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmModal;
