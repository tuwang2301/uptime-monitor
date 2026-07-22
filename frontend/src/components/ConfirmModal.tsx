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
        return 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className={`p-3 rounded-2xl mb-4 border ${
            type === 'danger' 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
              : type === 'warning' 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-xl hover:bg-gray-800 transition border border-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition ${getButtonColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
