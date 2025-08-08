import React from 'react';
import { ASCII_COLORS } from '../constants';
import * as localStorageService from '../services/localStorageService';

interface Props {
  show: boolean;
  onClose: () => void;
}

const VisualView: React.FC<Props> = ({ show, onClose }) => {
  if (!show) return null;
  const warehouses = localStorageService.getWarehouses();
  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-5xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>Visual View</h2>
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CLOSE]</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className={`p-3 border-2 ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`}>
                <div className="font-bold text-yellow-300 mb-2">🏢 {w.name}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {w.rooms?.map((r) => (
                    <div key={r.id} className="p-2 bg-black/40 rounded border border-yellow-800">
                      <div className="font-semibold mb-2">🏠 {r.name}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {r.shelves?.map((s) => (
                          <div key={s.id} className="p-2 bg-black rounded border border-yellow-900">
                            <div className="text-xs text-gray-300 mb-1">📦 {s.name}</div>
                            <div className="max-h-24 overflow-y-auto text-xs">
                              {s.items?.slice(0, 10).map((i) => (
                                <div key={i.id} className="truncate">• {i.name} ({i.quantity}{i.unit ? ' ' + i.unit : ''})</div>
                              ))}
                              {(!s.items || s.items.length === 0) && <div className="text-gray-600">[empty]</div>}
                            </div>
                          </div>
                        ))}
                        {(!r.shelves || r.shelves.length === 0) && <div className="text-gray-600">[no containers]</div>}
                      </div>
                    </div>
                  ))}
                  {(!w.rooms || w.rooms.length === 0) && <div className="text-gray-600">[no rooms]</div>}
                </div>
              </div>
            ))}
            {warehouses.length === 0 && <div className="text-gray-500">No warehouses yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualView;


