import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Clock, CheckCircle, X, Calendar, User } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import trashService, { TrashItem, DisposalReminder } from '../services/trashService';
import debugService from '../services/debugService';

interface TrashModalProps {
  show: boolean;
  onClose: () => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<'trash' | 'log' | 'reminders'>('trash');
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [disposalLog, setDisposalLog] = useState<TrashItem[]>([]);
  const [reminders, setReminders] = useState<DisposalReminder[]>([]);
  const [overdueReminders, setOverdueReminders] = useState<DisposalReminder[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]);

  const loadData = () => {
    setTrashItems(trashService.getTrashItems());
    setDisposalLog(trashService.getDisposalLog());
    setReminders(trashService.getActiveReminders());
    setOverdueReminders(trashService.getOverdueReminders());
    setStats(trashService.getStats());
  };

  const handleActuallyDispose = (itemId: string) => {
    if (trashService.markAsActuallyDisposed(itemId)) {
      loadData();
      debugService.action('TrashModal: Item actually disposed via UI', { itemId });
    }
  };

  const handleRestore = (itemId: string) => {
    const restoredItem = trashService.restoreFromTrash(itemId);
    if (restoredItem) {
      loadData();
      debugService.action('TrashModal: Item restored via UI', { itemId, itemName: restoredItem.name });
      // TODO: Add back to bucket or storage
    }
  };

  const handleCompleteReminder = (reminderId: string) => {
    if (trashService.completeReminder(reminderId)) {
      loadData();
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} days ago`;
    if (diffHours > 0) return `${diffHours} hours ago`;
    if (diffMinutes > 0) return `${diffMinutes} minutes ago`;
    return 'Just now';
  };

  const formatTimeUntil = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900 bg-opacity-20 border-red-600';
      case 'medium': return 'text-yellow-400 bg-yellow-900 bg-opacity-20 border-yellow-600';
      case 'low': return 'text-green-400 bg-green-900 bg-opacity-20 border-green-600';
      default: return 'text-gray-400 bg-gray-900 bg-opacity-20 border-gray-600';
    }
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-6xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center gap-3">
            <Trash2 className={`w-6 h-6 ${ASCII_COLORS.accent}`} />
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>Trash Management</h2>
            {overdueReminders.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-900 bg-opacity-20 border border-red-600 rounded text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {overdueReminders.length} overdue
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md hover:bg-red-700 border ${ASCII_COLORS.border}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className={`p-4 border-b ${ASCII_COLORS.border} bg-black bg-opacity-20`}>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.currentTrashCount}</div>
              <div className="text-xs text-gray-400">In Trash</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.totalDisposedItems}</div>
              <div className="text-xs text-gray-400">Total Disposed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.recentDisposals}</div>
              <div className="text-xs text-gray-400">Last 30 Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.overdueReminders}</div>
              <div className="text-xs text-gray-400">Overdue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.avgTimeInTrash}</div>
              <div className="text-xs text-gray-400">Avg Days</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${ASCII_COLORS.border}`}>
          {[
            { id: 'trash', label: 'Current Trash', icon: Trash2, count: trashItems.length },
            { id: 'reminders', label: 'Disposal Reminders', icon: Clock, count: reminders.length },
            { id: 'log', label: 'Disposal Log', icon: CheckCircle, count: disposalLog.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? `${ASCII_COLORS.accent} bg-yellow-900 bg-opacity-20 border-b-2 border-yellow-500` 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-yellow-600 text-black' : 'bg-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Current Trash Tab */}
          {activeTab === 'trash' && (
            <div className="space-y-4">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Trash is empty</p>
                  <p className="text-sm">Items you dispose will appear here</p>
                </div>
              ) : (
                trashItems.map(item => (
                  <div key={item.id} className={`p-4 border ${ASCII_COLORS.border} rounded-lg bg-gray-900 bg-opacity-20`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-white">{item.name}</h3>
                          <span className="text-sm text-gray-400">×{item.quantity}</span>
                          {item.estimatedDecompositionDays && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              (item.estimatedDecompositionDays || 0) <= 3 
                                ? 'bg-red-900 bg-opacity-20 text-red-400' 
                                : 'bg-gray-700 text-gray-300'
                            }`}>
                              {item.estimatedDecompositionDays}d decay
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            Disposed by {item.disposedBy}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(item.disposedAt)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            From: {item.originalLocation}
                          </div>
                          {item.disposalReason && (
                            <div className="text-gray-300">Reason: {item.disposalReason}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-blue-700 text-blue-400`}
                          title="Restore item"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleActuallyDispose(item.id)}
                          className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-red-700 text-red-400`}
                          title="Mark as actually disposed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              {reminders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active reminders</p>
                  <p className="text-sm">Disposal reminders will appear here</p>
                </div>
              ) : (
                reminders.map(reminder => (
                  <div key={reminder.id} className={`p-4 border rounded-lg ${getPriorityColor(reminder.priority)}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{reminder.itemName}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            reminder.priority === 'high' ? 'bg-red-600' : 
                            reminder.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                          } text-white`}>
                            {reminder.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm opacity-90">
                          <div>Remove: {formatTimeUntil(reminder.estimatedRemovalDate)}</div>
                          <div>Disposed: {formatTimeAgo(reminder.disposedAt)}</div>
                          <div>Reason: {reminder.reason}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Disposal Log Tab */}
          {activeTab === 'log' && (
            <div className="space-y-4">
              {disposalLog.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No disposal history</p>
                  <p className="text-sm">Completed disposals will appear here</p>
                </div>
              ) : (
                disposalLog.map(item => (
                  <div key={item.id} className={`p-4 border ${ASCII_COLORS.border} rounded-lg bg-green-900 bg-opacity-10`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-green-300">{item.name}</h3>
                          <span className="text-sm text-gray-400">×{item.quantity}</span>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-400">
                          <div>Disposed: {formatTimeAgo(item.disposedAt)} by {item.disposedBy}</div>
                          {item.actualDisposalDate && (
                            <div>Actually removed: {formatTimeAgo(item.actualDisposalDate)}</div>
                          )}
                          <div>From: {item.originalLocation}</div>
                          {item.disposalReason && (
                            <div>Reason: {item.disposalReason}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashModal;