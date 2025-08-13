import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import syncBatchService, { SyncStatus } from '../services/syncBatchService';

interface SyncStatusIndicatorProps {
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<SyncStatus>({
    isPending: false,
    pendingChanges: 0,
    timeUntilSend: 0,
    failedBatches: 0
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update status every second
    const updateStatus = () => {
      setStatus(syncBatchService.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events
    const handleSyncChange = () => updateStatus();
    const handleSyncSent = () => updateStatus();
    const handleSyncFailed = () => updateStatus();

    window.addEventListener('syncChangeAdded', handleSyncChange);
    window.addEventListener('syncBatchSent', handleSyncSent);
    window.addEventListener('syncBatchFailed', handleSyncFailed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncChangeAdded', handleSyncChange);
      window.removeEventListener('syncBatchSent', handleSyncSent);
      window.removeEventListener('syncBatchFailed', handleSyncFailed);
    };
  }, []);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0s';
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-400" />;
    }

    if (status.failedBatches > 0) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }

    if (status.isPending) {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }

    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  const getStatusText = (): string => {
    if (!isOnline) {
      return 'Offline';
    }

    if (status.failedBatches > 0) {
      return `${status.failedBatches} failed`;
    }

    if (status.isPending) {
      return `${status.pendingChanges} pending`;
    }

    if (status.lastSyncAt) {
      const timeSince = Date.now() - status.lastSyncAt.getTime();
      const minutes = Math.floor(timeSince / 60000);
      if (minutes < 1) return 'Just synced';
      if (minutes === 1) return '1 min ago';
      return `${minutes} mins ago`;
    }

    return 'Synced';
  };

  const getStatusColor = (): string => {
    if (!isOnline) return 'text-red-400 bg-red-900 bg-opacity-20 border-red-600';
    if (status.failedBatches > 0) return 'text-red-400 bg-red-900 bg-opacity-20 border-red-600';
    if (status.isPending) return 'text-yellow-400 bg-yellow-900 bg-opacity-20 border-yellow-600';
    return 'text-green-400 bg-green-900 bg-opacity-20 border-green-600';
  };

  const handleClick = () => {
    if (status.isPending) {
      // Force immediate sync
      syncBatchService.forceSend();
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs cursor-pointer transition-all hover:opacity-80 ${getStatusColor()} ${className}`}
      onClick={handleClick}
      title={
        status.isPending 
          ? `${status.pendingChanges} changes pending. Sending in ${formatTimeRemaining(status.timeUntilSend)}. Click to send now.`
          : !isOnline 
            ? 'Device is offline. Changes will sync when back online.'
            : status.failedBatches > 0
              ? `${status.failedBatches} sync batches failed. They will be retried automatically.`
              : 'All changes are synced'
      }
    >
      <div className="flex items-center gap-1">
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
      </div>
      
      {status.isPending && status.timeUntilSend > 0 && (
        <div className="flex items-center gap-1 text-xs opacity-75">
          <Clock className="w-3 h-3" />
          {formatTimeRemaining(status.timeUntilSend)}
        </div>
      )}
      
      {status.isPending && (
        <Loader className="w-3 h-3 animate-spin opacity-50" />
      )}
    </div>
  );
};

export default SyncStatusIndicator;