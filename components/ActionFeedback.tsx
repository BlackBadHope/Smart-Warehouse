import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface ActionFeedbackProps {
  type: 'loading' | 'success' | 'warning' | 'tip';
  message: string;
  show: boolean;
}

const ActionFeedback: React.FC<ActionFeedbackProps> = ({ type, message, show }) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'loading': return <Loader2 size={20} className="animate-spin" />;
      case 'success': return <CheckCircle size={20} className="text-green-400" />;
      case 'warning': return <AlertCircle size={20} className="text-yellow-400" />;
      case 'tip': return <Zap size={20} className="text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'loading': return 'bg-blue-900/80 border-blue-500 text-blue-100';
      case 'success': return 'bg-green-900/80 border-green-500 text-green-100';
      case 'warning': return 'bg-yellow-900/80 border-yellow-500 text-yellow-100';
      case 'tip': return 'bg-blue-900/80 border-blue-400 text-blue-100';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 p-3 rounded-lg border-2 shadow-lg z-50 flex items-center gap-3 max-w-sm ${getStyles()}`}>
      {getIcon()}
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default ActionFeedback;