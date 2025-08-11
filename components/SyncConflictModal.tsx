import React, { useState } from 'react';
import { AlertTriangle, Clock, Smartphone, Monitor, ArrowRight, Check, X } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface SyncConflict {
  id: string;
  type: 'warehouse' | 'room' | 'shelf' | 'item';
  objectId: string;
  objectName: string;
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: number;
  serverTimestamp: number;
  deviceName: string;
}

interface Props {
  show: boolean;
  conflicts: SyncConflict[];
  onResolve: (resolutions: Record<string, 'local' | 'server' | 'merge'>) => void;
  onCancel: () => void;
}

const SyncConflictModal: React.FC<Props> = ({ show, conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server' | 'merge'>>({});

  if (!show || conflicts.length === 0) return null;

  const handleResolveAll = (resolution: 'local' | 'server') => {
    const newResolutions: Record<string, 'local' | 'server' | 'merge'> = {};
    conflicts.forEach(conflict => {
      newResolutions[conflict.id] = resolution;
    });
    setResolutions(newResolutions);
  };

  const handleResolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    setResolutions(prev => ({
      ...prev,
      [conflictId]: resolution
    }));
  };

  const handleSubmit = () => {
    onResolve(resolutions);
  };

  const canSubmit = conflicts.every(conflict => resolutions[conflict.id]);

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-4xl border-2 ${ASCII_COLORS.border} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
            <AlertTriangle className="w-6 h-6 mr-2 text-yellow-400" />
            КОНФЛИКТЫ СИНХРОНИЗАЦИИ
          </h2>
          <div className="text-sm opacity-70">
            {conflicts.length} конфликт{conflicts.length > 1 ? 'ов' : ''}
          </div>
        </div>

        <div className="mb-6 bg-yellow-900 bg-opacity-20 p-4 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm mb-3">
            <strong>Что произошло?</strong> Одни и те же данные были изменены на разных устройствах. 
            Выберите, какую версию оставить для каждого конфликта.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleResolveAll('local')}
              className={`${ASCII_COLORS.buttonBg} px-3 py-1 rounded text-xs ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
            >
              <Smartphone className="w-3 h-3 mr-1" />
              ВСЕ ЛОКАЛЬНЫЕ
            </button>
            <button
              onClick={() => handleResolveAll('server')}
              className={`${ASCII_COLORS.buttonBg} px-3 py-1 rounded text-xs ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
            >
              <Monitor className="w-3 h-3 mr-1" />
              ВСЕ СЕРВЕРНЫЕ
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {conflicts.map((conflict, index) => (
            <div key={conflict.id} className={`${ASCII_COLORS.inputBg} border ${ASCII_COLORS.border} rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  #{index + 1}: {conflict.objectName} ({conflict.type})
                </h3>
                <span className="text-xs opacity-60">{conflict.field}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Local Version */}
                <div className={`border rounded p-3 ${resolutions[conflict.id] === 'local' ? 'border-green-500 bg-green-900 bg-opacity-20' : ASCII_COLORS.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center">
                      <Smartphone className="w-4 h-4 mr-1" />
                      ЛОКАЛЬНАЯ ВЕРСИЯ
                    </h4>
                    <div className="text-xs opacity-60 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(conflict.localTimestamp).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="text-sm break-all">
                    {typeof conflict.localValue === 'object' 
                      ? JSON.stringify(conflict.localValue, null, 2)
                      : String(conflict.localValue)
                    }
                  </div>
                  <button
                    onClick={() => handleResolveConflict(conflict.id, 'local')}
                    className={`mt-2 w-full py-1 px-2 rounded text-xs ${
                      resolutions[conflict.id] === 'local' 
                        ? 'bg-green-600 text-white' 
                        : `${ASCII_COLORS.buttonBg} ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`
                    } flex items-center justify-center`}
                  >
                    {resolutions[conflict.id] === 'local' ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        ВЫБРАНО
                      </>
                    ) : (
                      'ВЫБРАТЬ ЛОКАЛЬНУЮ'
                    )}
                  </button>
                </div>

                {/* Server Version */}
                <div className={`border rounded p-3 ${resolutions[conflict.id] === 'server' ? 'border-blue-500 bg-blue-900 bg-opacity-20' : ASCII_COLORS.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center">
                      <Monitor className="w-4 h-4 mr-1" />
                      СЕРВЕРНАЯ ВЕРСИЯ
                    </h4>
                    <div className="text-xs opacity-60 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(conflict.serverTimestamp).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="text-sm break-all">
                    {typeof conflict.serverValue === 'object' 
                      ? JSON.stringify(conflict.serverValue, null, 2)
                      : String(conflict.serverValue)
                    }
                  </div>
                  <button
                    onClick={() => handleResolveConflict(conflict.id, 'server')}
                    className={`mt-2 w-full py-1 px-2 rounded text-xs ${
                      resolutions[conflict.id] === 'server' 
                        ? 'bg-blue-600 text-white' 
                        : `${ASCII_COLORS.buttonBg} ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`
                    } flex items-center justify-center`}
                  >
                    {resolutions[conflict.id] === 'server' ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        ВЫБРАНО
                      </>
                    ) : (
                      'ВЫБРАТЬ СЕРВЕРНУЮ'
                    )}
                  </button>
                </div>
              </div>

              {/* Resolution indicator */}
              {resolutions[conflict.id] && (
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded text-xs ${
                    resolutions[conflict.id] === 'local' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    <ArrowRight className="w-3 h-3 mr-1" />
                    {resolutions[conflict.id] === 'local' ? 'Локальная версия будет сохранена' : 'Серверная версия будет сохранена'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm opacity-70">
            {Object.keys(resolutions).length} из {conflicts.length} конфликтов разрешено
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
            >
              <X className="w-4 h-4 mr-1" />
              ОТМЕНИТЬ СИНХРОНИЗАЦИЮ
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-4 py-2 rounded flex items-center font-semibold ${
                canSubmit 
                  ? `${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} ${ASCII_COLORS.buttonHoverBg} border border-green-500` 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 mr-1" />
              ПРИМЕНИТЬ РЕШЕНИЯ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncConflictModal;