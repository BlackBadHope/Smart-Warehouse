
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface ConfirmModalProps {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-80 flex items-center justify-center p-4 z-[100]`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-sm border-2 ${ASCII_COLORS.border}`}>
        <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent} flex items-center`}>
          <AlertTriangle className="mr-2" />
          CONFIRM ACTION
        </h2>
        <p className={`mb-6 ${ASCII_COLORS.text}`}>{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            [CANCEL]
          </button>
          <button
            onClick={onConfirm}
            className={`${ASCII_COLORS.buttonBg} text-red-400 p-2 px-4 rounded-md hover:bg-red-900 border ${ASCII_COLORS.border}`}
          >
            [CONFIRM]
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
