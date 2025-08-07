
import React, { useState, useEffect } from 'react';
import { ASCII_COLORS } from '../constants';

interface InputModalProps {
  show: boolean;
  title: string;
  label: string;
  onSubmit: (value: string) => void; // Can be async if needed by caller
  onCancel: () => void;
  initialValue?: string;
}

const InputModal: React.FC<InputModalProps> = ({ show, title, label, onSubmit, onCancel, initialValue = '' }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (show) {
      setInputValue(initialValue || '');
    }
  }, [initialValue, show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      await onSubmit(inputValue.trim()); // Await if onSubmit is async
      // onCancel(); // Caller (InventoryApp) will hide modal via setShowInputModal(false) in onSubmit callback
    }
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-80 flex items-center justify-center p-4 z-50`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-sm border-2 ${ASCII_COLORS.border}`}>
        <form onSubmit={handleSubmit}>
          <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>{title}</h2>
          <label htmlFor="input-modal-field" className={`block ${ASCII_COLORS.text} font-semibold mb-1`}>
            {label}
          </label>
          <input
            id="input-modal-field"
            type="text"
            className={`w-full p-2 border ${ASCII_COLORS.border} rounded-md ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
            >
              [SUBMIT]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputModal;
