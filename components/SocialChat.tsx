import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Package, Users, Settings, Smile, Search, Camera, FileText, Command } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import { ChatMessage, ChatParticipant, UserRole } from '../types';
import chatService from '../services/chatService';
import userService from '../services/userService';
import debugService from '../services/debugService';

interface SocialChatProps {
  warehouseId: string;
  warehouseName: string;
  show: boolean;
  onClose: () => void;
  onItemShare?: (itemId: string) => void;
}

const SocialChat: React.FC<SocialChatProps> = ({ 
  warehouseId, 
  warehouseName, 
  show, 
  onClose, 
  onItemShare 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'chat' | 'participants' | 'settings'>('chat');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      loadMessages();
      setupMessageListener();
      markMessagesAsRead();
    }

    return () => {
      cleanupMessageListener();
    };
  }, [show, warehouseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Handle command suggestions
    if (newMessage.startsWith('/')) {
      const commands = [
        '/find <item>',
        '/add <item> [quantity]', 
        '/status',
        '/help',
        '/invite'
      ];
      const query = newMessage.slice(1).toLowerCase();
      setCommandSuggestions(
        commands.filter(cmd => cmd.toLowerCase().includes(query))
      );
    } else {
      setCommandSuggestions([]);
    }
  }, [newMessage]);

  const loadMessages = async () => {
    try {
      const chatMessages = chatService.getMessages(warehouseId, 100);
      setMessages(chatMessages);
      
      const chat = chatService.getOrCreateChat(warehouseId);
      setParticipants(chat.participants);
    } catch (error) {
      debugService.error('SocialChat: Failed to load messages', error);
    }
  };

  const setupMessageListener = () => {
    chatService.onMessage(handleNewMessage);
  };

  const cleanupMessageListener = () => {
    // In a real implementation, we'd remove the specific listener
  };

  const handleNewMessage = (message: ChatMessage) => {
    if (message.warehouseId === warehouseId) {
      setMessages(prev => [...prev, message]);
    }
  };

  const markMessagesAsRead = () => {
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      chatService.markAsRead(warehouseId, currentUser.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      await chatService.sendMessage(warehouseId, newMessage.trim());
      setNewMessage('');
      setCommandSuggestions([]);
    } catch (error) {
      debugService.error('SocialChat: Failed to send message', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      await chatService.sendMessage(warehouseId, `📸 Photo: ${file.name}`, 'photo', {
        type: 'image',
        data: base64,
        thumbnail: base64 // In real app, create smaller thumbnail
      });
    } catch (error) {
      debugService.error('SocialChat: Failed to upload photo', error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleCommandSuggestionClick = (command: string) => {
    setNewMessage(command);
    setCommandSuggestions([]);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'master': return 'text-yellow-400';
      case 'editor': return 'text-green-400';
      case 'viewer': return 'text-blue-400';
      case 'guest': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case 'master': return '👑';
      case 'editor': return '✏️';
      case 'viewer': return '👁️';
      case 'guest': return '👤';
      default: return '👤';
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.senderId === userService.getCurrentUser()?.id;
    const isSystem = message.senderId === 'system';

    return (
      <div key={message.id} className={`mb-4 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
          isSystem 
            ? 'bg-blue-900/50 text-blue-200 text-center w-full' 
            : isOwnMessage 
              ? 'bg-yellow-600 text-black' 
              : `${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`
        }`}>
          {!isSystem && (
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{message.senderName}</span>
              <span className="text-xs opacity-70">{formatTimestamp(message.timestamp)}</span>
            </div>
          )}
          
          {message.type === 'text' && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          
          {message.type === 'photo' && message.attachment && (
            <div>
              <img 
                src={message.attachment.data} 
                alt="Shared photo" 
                className="max-w-full h-auto rounded-lg mb-2"
                style={{ maxHeight: '200px' }}
              />
              <div className="text-sm">{message.content}</div>
            </div>
          )}
          
          {message.type === 'item_share' && message.sharedItem && (
            <div className="border border-gray-500 rounded-lg p-2 bg-black/40">
              <div className="flex items-center mb-1">
                <Package className="w-4 h-4 mr-2" />
                <span className="font-medium">{message.sharedItem.itemName}</span>
              </div>
              <div className="text-sm text-gray-400">
                Quantity: {message.sharedItem.quantity}
              </div>
              <div className="text-sm text-gray-400">
                Location: {message.sharedItem.location}
              </div>
              {onItemShare && (
                <button
                  onClick={() => onItemShare(message.sharedItem!.itemId)}
                  className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded"
                >
                  View Item
                </button>
              )}
            </div>
          )}
          
          {message.type === 'action' && message.action && (
            <div className="flex items-center">
              <span className="mr-2">
                {message.action.type === 'item_added' && '📦'}
                {message.action.type === 'item_moved' && '🔄'}
                {message.action.type === 'item_deleted' && '🗑️'}
                {message.action.type === 'user_joined' && '👋'}
              </span>
              {message.content}
            </div>
          )}
          
          {(message.type === 'command' || message.type === 'invite') && (
            <div className="font-mono text-sm bg-black/60 p-2 rounded whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className={`modal-content ${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-4xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-400" />
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>
              {warehouseName} Chat
            </h2>
            <span className="ml-2 text-sm text-gray-400">
              ({participants.filter(p => p.isOnline).length} online)
            </span>
          </div>
          <button 
            onClick={onClose} 
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            [CLOSE]
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${ASCII_COLORS.border}`}>
          {[
            { id: 'chat', label: 'Chat', icon: FileText },
            { id: 'participants', label: 'Members', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-r ${ASCII_COLORS.border} transition-colors ${
                selectedTab === tab.id 
                  ? `${ASCII_COLORS.accent} bg-yellow-900/20` 
                  : `text-gray-400 hover:text-gray-200`
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'chat' && (
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start a conversation or try /help for commands</p>
                  </div>
                ) : (
                  <>
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Command Suggestions */}
              {commandSuggestions.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {commandSuggestions.map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => handleCommandSuggestionClick(cmd)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className={`p-4 border-t ${ASCII_COLORS.border}`}>
                <div className="flex items-center space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message or /command..."
                    className={`flex-1 p-2 rounded border ${ASCII_COLORS.border} ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                    disabled={isLoading}
                  />
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 ${ASCII_COLORS.buttonBg} rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
                    title="Upload Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    className={`p-2 ${ASCII_COLORS.buttonBg} rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'participants' && (
            <div className="p-4">
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold mb-3`}>
                Members ({participants.length})
              </h3>
              <div className="space-y-3">
                {participants.map(participant => (
                  <div key={participant.userId} className={`flex items-center justify-between p-3 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${participant.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <div>
                        <div className="font-medium">{participant.userName}</div>
                        <div className="text-sm text-gray-400">
                          Last seen: {formatTimestamp(participant.lastSeen)}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center ${getRoleColor(participant.role)}`}>
                      <span className="mr-1">{getRoleIcon(participant.role)}</span>
                      <span className="text-sm font-medium">{participant.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'settings' && (
            <div className="p-4">
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold mb-3`}>
                Chat Settings
              </h3>
              <div className="space-y-4">
                <div className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="space-y-2 text-sm">
                    <div>✅ Photo sharing enabled</div>
                    <div>✅ Chat commands enabled</div>
                    <div>✅ Item sharing enabled</div>
                    <div>✅ System actions enabled</div>
                  </div>
                </div>
                
                <div className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                  <h4 className="font-medium mb-2">Available Commands</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <div>/find &lt;item&gt; - Search for items</div>
                    <div>/add &lt;item&gt; [qty] - Quick add item</div>
                    <div>/status - Show warehouse stats</div>
                    <div>/invite - Get invite code</div>
                    <div>/help - Show all commands</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialChat;