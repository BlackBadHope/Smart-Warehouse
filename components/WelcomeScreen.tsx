import React, { useState, useEffect } from 'react';
import { User, Smartphone, Wifi, Check, ArrowRight } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import deviceIdentityService from '../services/deviceIdentityService';
import debugService from '../services/debugService';

interface WelcomeScreenProps {
  show: boolean;
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ show, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      // Load current device identity
      const deviceIdentity = deviceIdentityService.getDeviceIdentity();
      setDeviceName(deviceIdentity.deviceName);
      
      // Pre-fill nickname if available
      const userProfile = deviceIdentityService.getUserProfile();
      if (userProfile?.nickname) {
        setNickname(userProfile.nickname);
      }
      
      debugService.info('WelcomeScreen: Displayed for first-time setup');
    }
  }, [show]);

  const handleNicknameSubmit = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    
    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters');
      return;
    }
    
    if (nickname.trim().length > 50) {
      setError('Nickname must be less than 50 characters');
      return;
    }
    
    setError('');
    setCurrentStep(2);
  };

  const handleDeviceNameSubmit = () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }
    
    if (deviceName.trim().length < 2) {
      setError('Device name must be at least 2 characters');
      return;
    }
    
    setError('');
    setCurrentStep(3);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Update device name
      deviceIdentityService.updateDeviceName(deviceName.trim());
      
      // Complete user setup
      deviceIdentityService.completeUserSetup(nickname.trim());
      
      debugService.action('WelcomeScreen: Setup completed', {
        nickname: nickname.trim(),
        deviceName: deviceName.trim()
      });
      
      // Small delay for better UX
      setTimeout(() => {
        onComplete();
      }, 1000);
      
    } catch (error) {
      debugService.error('WelcomeScreen: Setup failed', error);
      setError('Failed to complete setup. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[9999] p-4">
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-lg border-2 ${ASCII_COLORS.border}`}>
        
        {/* Header */}
        <div className={`p-6 border-b-2 ${ASCII_COLORS.border} text-center`}>
          <h1 className={`${ASCII_COLORS.accent} text-2xl font-bold mb-2`}>
            📦 Welcome to Inventory OS
          </h1>
          <p className="text-gray-300 text-sm">
            Let's set up your personal inventory system
          </p>
        </div>

        {/* Progress indicator */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step <= currentStep 
                    ? `${ASCII_COLORS.accent} bg-yellow-600 border-yellow-500 text-black` 
                    : 'border-gray-600 text-gray-400'
                }`}>
                  {step < currentStep ? <Check size={16} /> : step}
                </div>
                {step < 3 && (
                  <ArrowRight className={`mx-2 ${step < currentStep ? ASCII_COLORS.accent : 'text-gray-600'}`} size={16} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Your Name</span>
            <span>Device</span>
            <span>Ready!</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Step 1: Nickname */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <User className={`${ASCII_COLORS.accent} w-12 h-12 mx-auto mb-3`} />
                <h2 className={`${ASCII_COLORS.accent} text-xl font-bold mb-2`}>
                  Choose Your Nickname
                </h2>
                <p className="text-gray-300 text-sm">
                  This name will be visible to other users in shared warehouses
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleNicknameSubmit)}
                  placeholder="Enter your nickname..."
                  className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-center text-lg`}
                  maxLength={50}
                  autoFocus
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {nickname.length}/50
                </div>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-20 p-2 rounded">
                  {error}
                </div>
              )}
              
              <button
                onClick={handleNicknameSubmit}
                disabled={!nickname.trim()}
                className={`w-full ${ASCII_COLORS.buttonBg} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center justify-center font-medium`}
              >
                Continue <ArrowRight className="ml-2" size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Device Name */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Smartphone className={`${ASCII_COLORS.accent} w-12 h-12 mx-auto mb-3`} />
                <h2 className={`${ASCII_COLORS.accent} text-xl font-bold mb-2`}>
                  Name Your Device
                </h2>
                <p className="text-gray-300 text-sm">
                  This helps identify your device in the network
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleDeviceNameSubmit)}
                  placeholder="e.g., John's Phone, Kitchen Tablet..."
                  className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} text-center text-lg`}
                  maxLength={30}
                  autoFocus
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {deviceName.length}/30
                </div>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-20 p-2 rounded">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className={`flex-1 ${ASCII_COLORS.buttonBg} p-3 rounded-md border ${ASCII_COLORS.border} text-gray-300`}
                >
                  Back
                </button>
                <button
                  onClick={handleDeviceNameSubmit}
                  disabled={!deviceName.trim()}
                  className={`flex-1 ${ASCII_COLORS.buttonBg} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center justify-center font-medium`}
                >
                  Continue <ArrowRight className="ml-2" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Wifi className={`${ASCII_COLORS.accent} w-12 h-12 mx-auto mb-3`} />
                <h2 className={`${ASCII_COLORS.accent} text-xl font-bold mb-2`}>
                  You're All Set!
                </h2>
                <p className="text-gray-300 text-sm">
                  Ready to start managing your inventory
                </p>
              </div>
              
              <div className={`bg-gray-800 bg-opacity-50 p-4 rounded-lg border ${ASCII_COLORS.border}`}>
                <h3 className="font-medium mb-3">Your Setup:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nickname:</span>
                    <span className={ASCII_COLORS.accent}>{nickname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Device:</span>
                    <span className={ASCII_COLORS.accent}>{deviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Device ID:</span>
                    <span className="font-mono text-xs">{deviceIdentityService.getDeviceIdentity().deviceId.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-20 p-2 rounded">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={isLoading}
                  className={`flex-1 ${ASCII_COLORS.buttonBg} p-3 rounded-md border ${ASCII_COLORS.border} text-gray-300 disabled:opacity-50`}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className={`flex-1 ${ASCII_COLORS.buttonBg} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center justify-center font-medium`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      Start Using <Check className="ml-2" size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;