import React, { useRef, useState } from 'react';
import { ASCII_COLORS } from '../constants';
import { exportAll, detectConflicts, importBundle, IdConflict, ExportBundle } from '../services/importExportService';

interface Props {
  show: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

const ImportExportModal: React.FC<Props> = ({ show, onClose, onDataChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<string>('');
  const [conflicts, setConflicts] = useState<IdConflict[]>([]);
  const [decisionAll, setDecisionAll] = useState<'skip' | 'overwrite' | 'newId'>('newId');

  if (!show) return null;

  const handleExport = () => {
    const bundle = exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-os-export-${timestamp}.json`;
    a.click();
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as ExportBundle;
      const conflictsDetected = detectConflicts(bundle);
      setConflicts(conflictsDetected);
      if (conflictsDetected.length === 0) {
        const report = importBundle(bundle, { onConflict: () => 'newId' });
        setLog(`Импорт завершён. Детали: ${JSON.stringify(report)}`);
        onDataChange?.();
      } else {
        setLog(`Обнаружены конфликты ID: ${conflictsDetected.length}. Выберите стратегию и нажмите "Импортировать".`);
        // store bundle in element dataset
        (e.target as any)._bundle = bundle;
      }
    } catch (err) {
      setLog(`Ошибка чтения файла: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleImportWithDecision = () => {
    const inputEl = fileRef.current as any;
    const bundle = inputEl && inputEl._bundle as ExportBundle;
    if (!bundle) return alert('Загрузите файл заново');
    const report = importBundle(bundle, { onConflict: () => decisionAll });
    setLog(`Импорт завершён. Детали: ${JSON.stringify(report)}`);
    setConflicts([]);
    delete inputEl._bundle;
    onDataChange?.();
  };

  return (
    <div className={`modal-backdrop fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`modal-content ${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-2xl border-2 ${ASCII_COLORS.border} max-h-[90vh] overflow-y-auto`}>
        <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Import / Export</h3>
        <div className="flex gap-2 mb-4">
          <button onClick={handleExport} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[EXPORT JSON]</button>
          <button onClick={handlePickFile} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[IMPORT JSON]</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </div>
        {conflicts.length > 0 && (
          <div className={`p-3 border ${ASCII_COLORS.border} rounded mb-3`}>
            <div className="text-yellow-300 mb-2 font-semibold">Конфликты ID ({conflicts.length}):</div>
            <div className="text-sm max-h-48 overflow-y-auto bg-black/40 p-2 rounded">
              {conflicts.map((c, idx) => (
                <div key={idx} className="border-b border-yellow-800 py-1">
                  <div><span className="text-gray-400">Type:</span> {c.entityType}</div>
                  <div><span className="text-gray-400">ID:</span> {c.id}</div>
                  {c.name && <div><span className="text-gray-400">Name:</span> {c.name}</div>}
                  {c.path && <div><span className="text-gray-400">Path:</span> {c.path}</div>}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-300">Стратегия для всех конфликтов:</span>
              <select value={decisionAll} onChange={(e)=>setDecisionAll(e.target.value as any)} className={`text-sm p-1 rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} border ${ASCII_COLORS.border}`}>
                <option value="newId">Назначить новые ID</option>
                <option value="overwrite">Перезаписать существующие</option>
                <option value="skip">Пропустить</option>
              </select>
              <button onClick={handleImportWithDecision} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[ИМПОРТИРОВАТЬ]</button>
            </div>
          </div>
        )}
        {log && <div className={`text-xs text-gray-400 whitespace-pre-wrap`}>{log}</div>}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CLOSE]</button>
        </div>
      </div>
    </div>
  );
};

export default ImportExportModal;


