import React, { useState, useEffect } from 'react';
import { X, Palette, Move, Type, Layers, Sparkles } from 'lucide-react';
import themeService from '../services/themeService';
import { ElementCustomization } from '../types/theme';

interface ElementCustomizerProps {
  elementId: string;
  element: HTMLElement;
  onClose: () => void;
}

export default function ElementCustomizer({ elementId, element, onClose }: ElementCustomizerProps) {
  const [styles, setStyles] = useState<ElementCustomization['customStyles']>({});
  const [activeTab, setActiveTab] = useState<'colors' | 'layout' | 'typography' | 'effects'>('colors');
  
  const vibe = themeService.getVibeConfig();

  useEffect(() => {
    // Load existing styles for this element
    const computedStyle = window.getComputedStyle(element);
    setStyles({
      background: computedStyle.backgroundColor || '',
      color: computedStyle.color || '',
      borderColor: computedStyle.borderColor || '',
      borderWidth: computedStyle.borderWidth || '',
      borderRadius: computedStyle.borderRadius || '',
      padding: computedStyle.padding || '',
      margin: computedStyle.margin || '',
      fontSize: computedStyle.fontSize || '',
      fontWeight: computedStyle.fontWeight || '',
      boxShadow: computedStyle.boxShadow || '',
      opacity: computedStyle.opacity || '',
      transform: computedStyle.transform || ''
    });
  }, [element]);

  const updateStyle = (property: string, value: string) => {
    const newStyles = { ...styles, [property]: value };
    setStyles(newStyles);
    themeService.customizeElement(elementId, newStyles);
  };

  const resetElement = () => {
    themeService.removeElementCustomization(elementId);
    onClose();
  };

  const quickColors = [
    vibe.colors.primary,
    vibe.colors.secondary, 
    vibe.colors.accent,
    vibe.colors.background,
    vibe.colors.surface,
    vibe.colors.text,
    vibe.colors.success,
    vibe.colors.warning,
    vibe.colors.error,
    vibe.colors.info
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-900 border border-yellow-600 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-700">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Element Designer
          </h2>
          <button onClick={onClose} className="bg-gray-800 p-2 rounded text-white hover:bg-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* Element Info */}
        <div className="p-3 bg-gray-800 text-sm text-gray-300 border-b border-gray-700">
          <strong>Element:</strong> {element.tagName.toLowerCase()}
          {element.className && <span> .{element.className.split(' ')[0]}</span>}
          <br />
          <strong>ID:</strong> {elementId}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'colors', icon: Palette, label: 'Colors' },
            { id: 'layout', icon: Move, label: 'Layout' },  
            { id: 'typography', icon: Type, label: 'Text' },
            { id: 'effects', icon: Layers, label: 'Effects' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 p-3 text-xs flex items-center justify-center gap-1 ${
                activeTab === tab.id 
                  ? 'bg-yellow-600 text-white' 
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Background</label>
                <div className="flex gap-2 mb-2">
                  {quickColors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateStyle('background', color)}
                      className="w-6 h-6 rounded border border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={styles.background || ''}
                  onChange={(e) => updateStyle('background', e.target.value)}
                  placeholder="#000000 or rgb(0,0,0)"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Text Color</label>
                <div className="flex gap-2 mb-2">
                  {quickColors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateStyle('color', color)}
                      className="w-6 h-6 rounded border border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={styles.color || ''}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  placeholder="#ffffff"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Border Color</label>
                <input
                  type="text"
                  value={styles.borderColor || ''}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  placeholder="#444444"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Border Width</label>
                <select
                  value={styles.borderWidth || ''}
                  onChange={(e) => updateStyle('borderWidth', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="1px">1px</option>
                  <option value="2px">2px</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Border Radius</label>
                <select
                  value={styles.borderRadius || ''}
                  onChange={(e) => updateStyle('borderRadius', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="0px">Sharp (0px)</option>
                  <option value="4px">Small (4px)</option>
                  <option value="8px">Medium (8px)</option>
                  <option value="12px">Large (12px)</option>
                  <option value="50%">Round (50%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Padding</label>
                <select
                  value={styles.padding || ''}
                  onChange={(e) => updateStyle('padding', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="4px">XS (4px)</option>
                  <option value="8px">SM (8px)</option>
                  <option value="16px">MD (16px)</option>
                  <option value="24px">LG (24px)</option>
                  <option value="32px">XL (32px)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Margin</label>
                <input
                  type="text"
                  value={styles.margin || ''}
                  onChange={(e) => updateStyle('margin', e.target.value)}
                  placeholder="8px or 8px 16px"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Font Size</label>
                <select
                  value={styles.fontSize || ''}
                  onChange={(e) => updateStyle('fontSize', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="12px">XS (12px)</option>
                  <option value="14px">SM (14px)</option>
                  <option value="16px">Base (16px)</option>
                  <option value="18px">LG (18px)</option>
                  <option value="20px">XL (20px)</option>
                  <option value="24px">2XL (24px)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Font Weight</label>
                <select
                  value={styles.fontWeight || ''}
                  onChange={(e) => updateStyle('fontWeight', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="300">Light</option>
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi Bold</option>
                  <option value="700">Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Box Shadow</label>
                <select
                  value={styles.boxShadow || ''}
                  onChange={(e) => updateStyle('boxShadow', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">No Shadow</option>
                  <option value="0 1px 2px rgba(0,0,0,0.1)">Small</option>
                  <option value="0 4px 8px rgba(0,0,0,0.15)">Medium</option>
                  <option value="0 8px 16px rgba(0,0,0,0.2)">Large</option>
                  <option value={vibe.shadows.sm}>Vibe Small</option>
                  <option value={vibe.shadows.md}>Vibe Medium</option>
                  <option value={vibe.shadows.lg}>Vibe Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={styles.opacity || '1'}
                  onChange={(e) => updateStyle('opacity', e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{styles.opacity || '1'}</span>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Transform</label>
                <select
                  value={styles.transform || ''}
                  onChange={(e) => updateStyle('transform', e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">None</option>
                  <option value="rotate(3deg)">Rotate 3°</option>
                  <option value="rotate(-3deg)">Rotate -3°</option>
                  <option value="scale(1.05)">Scale 105%</option>
                  <option value="scale(0.95)">Scale 95%</option>
                  <option value="translateY(-2px)">Move Up</option>
                  <option value="translateY(2px)">Move Down</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex gap-2">
          <button
            onClick={resetElement}
            className="flex-1 p-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 p-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}