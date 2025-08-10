import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Copy } from 'lucide-react';
import debugService from '../services/debugService';
import { ASCII_COLORS } from '../constants';

interface DebugModalProps {
  show: boolean;
  onClose: () => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ show, onClose }) => {
  const [events, setEvents] = useState(debugService.getEvents());

  useEffect(() => {
    if (show) {
      setEvents(debugService.getEvents());
    }
  }, [show]);

  const handleRefresh = () => {
    setEvents(debugService.getEvents());
  };

  const handleClear = () => {
    debugService.clearEvents();
    setEvents([]);
  };

  const handleCopyLog = async () => {
    const logText = events.map(event => {
      let text = `[${event.type.toUpperCase()}] ${event.timestamp}\n${event.message}`;
      if (event.details) {
        text += `\nDetails: ${JSON.stringify(event.details, null, 2)}`;
      }
      return text;
    }).join('\n\n---\n\n');
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(logText);
        debugService.info('Debug log copied to clipboard');
      } else {
        // Fallback for older browsers/mobile
        const textArea = document.createElement('textarea');
        textArea.value = logText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        debugService.info('Debug log copied to clipboard (fallback)');
      }
    } catch (error) {
      debugService.error('Failed to copy log to clipboard', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'action': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-xl w-full max-w-4xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-yellow-700">
          <h2 className={`text-2xl font-bold ${ASCII_COLORS.accent}`}>DEBUG LOG</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh} 
              className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button 
              onClick={handleCopyLog} 
              className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
              title="Copy log to clipboard"
            >
              <Copy size={16} />
            </button>
            <button 
              onClick={handleClear} 
              className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
              title="Clear all logs"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {events.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No debug events logged yet</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className={`p-3 rounded border ${ASCII_COLORS.inputBg} border-gray-600`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(event.type)} bg-opacity-20 border border-current`}>
                      {event.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{event.timestamp}</span>
                  </div>
                  <p className={`${ASCII_COLORS.text} mb-2`}>{event.message}</p>
                  {event.details && (
                    <pre className="text-xs text-gray-300 bg-black p-2 rounded overflow-x-auto">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugModal;