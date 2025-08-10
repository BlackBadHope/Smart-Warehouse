
import React, { useState, useEffect, useRef } from 'react';
import { ASCII_COLORS } from '../constants';
import debugService from '../services/debugService';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setInputValue(initialValue || '');
      // Focus input after modal animation
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [initialValue, show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clean input more thoroughly for mobile/international characters
    const cleanedValue = inputValue.replace(/^\s+|\s+$/g, '').replace(/\u00A0/g, ' ').trim();
    debugService.action('InputModal: Form submitted', { title, inputValue: cleanedValue, originalValue: inputValue });
    
    if (cleanedValue && cleanedValue.length > 0) {
      try {
        await onSubmit(cleanedValue);
        debugService.info('InputModal: Successfully submitted', { submittedValue: cleanedValue });
      } catch (error) {
        debugService.error('InputModal: Submit failed', error);
      }
    } else {
      debugService.warning('InputModal: Empty input submitted', { inputValue, cleanedValue, inputLength: inputValue.length });
    }
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-80 flex items-center justify-center p-4 z-50`}>
      <div className={`${ASCII_COLORS.modalBg} p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-sm border-2 ${ASCII_COLORS.border} mx-4`}>
        <form onSubmit={handleSubmit}>
          <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>{title}</h2>
          <label htmlFor="input-modal-field" className={`block ${ASCII_COLORS.text} font-semibold mb-1`}>
            {label}
          </label>
          <input
            id="input-modal-field"
            ref={inputRef}
            type="text"
            className={`w-full p-3 text-lg border ${ASCII_COLORS.border} rounded-md ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              debugService.action('InputModal: Input changed', { newValue, charCode: newValue.charCodeAt(newValue.length - 1) });
              setInputValue(newValue);
            }}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="words"
            spellCheck={true}
            inputMode="text"
            lang="ru"
            required
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
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
