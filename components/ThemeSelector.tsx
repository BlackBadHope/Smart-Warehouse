import React, { useState } from 'react';
import { Palette, Eye, EyeOff, Download, Upload, X } from 'lucide-react';
import themeService from '../services/themeService';
import { VibeType } from '../types/theme';
import ElementCustomizer from './ElementCustomizer';

interface ThemeSelectorProps {
  show: boolean;
  onClose: () => void;
}

export default function ThemeSelector({ show, onClose }: ThemeSelectorProps) {
  const [currentVibe, setCurrentVibe] = useState(themeService.getCurrentVibe());
  const [designerMode, setDesignerMode] = useState(themeService.isDesignerModeEnabled());
  const [showElementCustomizer, setShowElementCustomizer] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{ id: string; element: HTMLElement } | null>(null);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);

  const allVibes = themeService.getAllVibes();

  // Update state when modal opens
  React.useEffect(() => {
    if (show) {
      setCurrentVibe(themeService.getCurrentVibe());
      setDesignerMode(themeService.isDesignerModeEnabled());
      setExportData('');
      setImportData('');
      setShowImportExport(false);
    }
  }, [show]);

  React.useEffect(() => {
    const handleElementCustomizer = (event: CustomEvent) => {
      setSelectedElement({
        id: event.detail.elementId,
        element: event.detail.element
      });
      setShowElementCustomizer(true);
    };

    document.addEventListener('showElementCustomizer', handleElementCustomizer as EventListener);
    return () => {
      document.removeEventListener('showElementCustomizer', handleElementCustomizer as EventListener);
    };
  }, []);

  if (!show) return null;

  const handleVibeChange = (vibeId: VibeType) => {
    setCurrentVibe(vibeId);
    themeService.setVibe(vibeId);
  };

  const toggleDesignerMode = () => {
    const newMode = themeService.toggleDesignerMode();
    setDesignerMode(newMode);
  };

  const handleExport = () => {
    const data = themeService.exportTheme();
    setExportData(data);
    setShowImportExport(true);
  };

  const handleImport = () => {
    if (importData.trim()) {
      const success = themeService.importTheme(importData.trim());
      if (success) {
        setCurrentVibe(themeService.getCurrentVibe());
        alert('Theme imported successfully!');
        setImportData('');
        setShowImportExport(false);
        // Force re-render by triggering a state update
        window.location.reload(); // Simple solution for now
      } else {
        alert('Failed to import theme. Please check the data.');
      }
    }
  };

  const getVibePreviewStyle = (vibe: any) => ({
    background: `linear-gradient(135deg, ${vibe.colors.background} 0%, ${vibe.colors.surface} 50%, ${vibe.colors.primary} 100%)`,
    border: `2px solid ${vibe.colors.border}`,
    color: vibe.colors.text
  });

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 border border-yellow-600 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-700">
          <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Designer
          </h2>
          <button onClick={onClose} className="bg-gray-800 p-2 rounded text-white hover:bg-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* Designer Mode Toggle */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Designer Mode</h3>
              <p className="text-gray-400 text-sm">Click any element to customize it</p>
            </div>
            <button
              onClick={toggleDesignerMode}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                designerMode 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {designerMode ? <Eye size={16} /> : <EyeOff size={16} />}
              {designerMode ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Vibes Grid */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <h3 className="text-white font-medium mb-4">Choose Your Vibe</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allVibes.map(vibe => (
              <button
                key={vibe.id}
                onClick={() => handleVibeChange(vibe.id)}
                className={`p-4 rounded-lg text-left transition-all ${
                  currentVibe === vibe.id 
                    ? 'ring-2 ring-yellow-400' 
                    : 'hover:ring-1 hover:ring-gray-500'
                }`}
                style={getVibePreviewStyle(vibe)}
              >
                <div className="font-medium text-sm mb-1">{vibe.name}</div>
                <div className="text-xs opacity-75 mb-2">{vibe.description}</div>
                <div className="flex gap-1">
                  {[vibe.colors.primary, vibe.colors.accent, vibe.colors.secondary].map((color, idx) => (
                    <div
                      key={idx}
                      className="w-3 h-3 rounded-full border border-current"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Import/Export */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download size={16} />
              Export Theme
            </button>
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Upload size={16} />
              Import Theme
            </button>
          </div>

          {showImportExport && (
            <div className="mt-4 p-4 bg-gray-800 rounded">
              {exportData && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Export Data (share this)</label>
                  <textarea
                    value={exportData}
                    readOnly
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-xs h-20"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm text-gray-300 mb-2">Import Theme Data</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste theme data here..."
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-xs h-20 mb-2"
                />
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Element Customizer Modal */}
      {showElementCustomizer && selectedElement && (
        <ElementCustomizer
          elementId={selectedElement.id}
          element={selectedElement.element}
          onClose={() => setShowElementCustomizer(false)}
        />
      )}
    </div>
  );
}