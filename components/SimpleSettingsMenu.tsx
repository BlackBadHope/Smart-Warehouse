import React, { useState } from 'react';
import { Settings, X, Wifi, Users, TestTube, Info } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface SimpleSettingsMenuProps {
  onShowNetworkManager: () => void;
  onShowSelfTest: () => void;
  onShowInfo: () => void;
}

const SimpleSettingsMenu: React.FC<SimpleSettingsMenuProps> = ({
  onShowNetworkManager,
  onShowSelfTest,  
  onShowInfo
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} transition-colors`}
        title="Settings & Tools"
      >
        <Settings size={18} className="text-gray-300" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(false)}
        className={`${ASCII_COLORS.buttonBg} p-2 rounded-md border ${ASCII_COLORS.border} bg-yellow-600 text-black`}
        title="Close Settings"
      >
        <Settings size={18} />
      </button>
      
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Menu Panel */}
      <div className={`absolute top-12 right-0 w-64 ${ASCII_COLORS.modalBg} border-2 ${ASCII_COLORS.border} rounded-lg shadow-2xl z-50`}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`${ASCII_COLORS.accent} font-bold`}>⚙️ Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Simple Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onShowNetworkManager();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded ${ASCII_COLORS.buttonBg} hover:bg-gray-600 transition-colors`}
            >
              <Wifi size={16} className="text-blue-400" />
              <span className={`${ASCII_COLORS.text} text-sm`}>Simple P2P Network</span>
            </button>
            
            <button
              onClick={() => {
                onShowSelfTest();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded ${ASCII_COLORS.buttonBg} hover:bg-gray-600 transition-colors`}
            >
              <TestTube size={16} className="text-purple-400" />
              <span className={`${ASCII_COLORS.text} text-sm`}>Self-Test Suite</span>
            </button>
            
            <button
              onClick={() => {
                onShowInfo();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded ${ASCII_COLORS.buttonBg} hover:bg-gray-600 transition-colors`}
            >
              <Info size={16} className="text-gray-400" />
              <span className={`${ASCII_COLORS.text} text-sm`}>App Info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleSettingsMenu;