import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import deviceIdentityService from '../services/deviceIdentityService';

interface CreateEntityModalProps {
  show: boolean;
  type: 'warehouse' | 'room' | 'shelf' | 'item';
  title: string;
  label: string;
  parentContext?: string; // e.g., "in Storage Room"
  onSubmit: (name: string, isPublic: boolean) => Promise<void>;
  onCancel: () => void;
  initialValue?: string;
}

const CreateEntityModal: React.FC<CreateEntityModalProps> = ({
  show,
  type,
  title,
  label,
  parentContext,
  onSubmit,
  onCancel,
  initialValue = ''
}) => {
  const [name, setName] = useState(initialValue);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setName(initialValue);
      setIsPublic(false); // Default to private
      setError('');
    }
  }, [show, initialValue]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (name.trim().length > 100) {
      setError('Name must be less than 100 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(name.trim(), isPublic);
    } catch (error) {
      setError((error as Error).message);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!show) return null;

  const userProfile = deviceIdentityService.getUserProfile();
  const userNickname = userProfile?.nickname || 'Anonymous';

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${ASCII_COLORS.accent} text-lg font-bold`}>{title}</h3>
          <button 
            onClick={onCancel}
            className={`${ASCII_COLORS.buttonBg} p-1 rounded hover:bg-red-700 border ${ASCII_COLORS.border}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Context info */}
        {parentContext && (
          <div className="mb-4 text-sm text-gray-400">
            {parentContext}
          </div>
        )}

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{label}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Enter ${type} name...`}
            className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
            maxLength={100}
            autoFocus
            disabled={isLoading}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Created by: {userNickname}</span>
            <span>{name.length}/100</span>
          </div>
        </div>

        {/* Privacy settings */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-3">Privacy Settings</label>
          
          <div className="space-y-3">
            {/* Public option */}
            <div 
              onClick={() => setIsPublic(true)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                isPublic 
                  ? `border-green-500 bg-green-900 bg-opacity-20` 
                  : `border-gray-600 hover:border-gray-500`
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  isPublic ? 'border-green-500 bg-green-500' : 'border-gray-400'
                }`}>
                  {isPublic && <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>}
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-green-400" />
                  <span className="font-medium text-green-300">Public</span>
                </div>
              </div>
              <div className="text-sm text-gray-400 ml-7 mt-1">
                Visible to all users in your network. Anyone can view contents.
              </div>
            </div>

            {/* Private option */}
            <div 
              onClick={() => setIsPublic(false)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                !isPublic 
                  ? `border-yellow-500 bg-yellow-900 bg-opacity-20` 
                  : `border-gray-600 hover:border-gray-500`
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  !isPublic ? 'border-yellow-500 bg-yellow-500' : 'border-gray-400'
                }`}>
                  {!isPublic && <div className="w-2 h-2 rounded-full bg-black m-0.5"></div>}
                </div>
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-yellow-400" />
                  <span className="font-medium text-yellow-300">Private</span>
                </div>
              </div>
              <div className="text-sm text-gray-400 ml-7 mt-1">
                Only visible to users with specific permissions. More secure.
              </div>
            </div>
          </div>
        </div>

        {/* Privacy inheritance notice */}
        <div className="mb-4 p-2 bg-blue-900 bg-opacity-20 border border-blue-600 rounded text-xs text-blue-300">
          <div className="flex items-start">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></div>
            <div>
              <strong>Note:</strong> Child items inherit privacy settings by default. 
              Private {type}s can only contain private items, while public {type}s can contain both.
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-600 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded border ${ASCII_COLORS.border} text-gray-300 disabled:opacity-50`}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className={`${ASCII_COLORS.buttonBg} px-6 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                {isPublic ? <Eye className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Create {isPublic ? 'Public' : 'Private'} {type.charAt(0).toUpperCase() + type.slice(1)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEntityModal;