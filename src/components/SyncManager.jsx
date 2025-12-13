import React, { useState } from 'react';

const SyncManager = ({ 
  isSyncing, 
  lastSync, 
  syncStatus, 
  localChanges, 
  remoteChanges,
  onSync,
  autoSync,
  onToggleAutoSync 
}) => {
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  return (
    <div className="sync-manager">
      <div className="sync-status" onClick={() => setShowSyncDetails(!showSyncDetails)}>
        {isSyncing ? (
          <span className="syncing-indicator">
            <span className="spinner"></span>
            Синхронизация...
          </span>
        ) : (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSync();
              }}
              className="sync-button"
              disabled={isSyncing}
              title="Синхронизировать сейчас"
            >
              🔄
            </button>
            
            {lastSync && (
              <span className="last-sync-time" title="Последняя синхронизация">
                {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            
            {(localChanges > 0 || remoteChanges > 0) && (
              <span className="changes-indicator">
                {localChanges > 0 && <span className="local-changes" title="Локальные изменения">📝{localChanges}</span>}
                {remoteChanges > 0 && <span className="remote-changes" title="Обновления на сервере">☁️{remoteChanges}</span>}
              </span>
            )}
          </>
        )}
      </div>
      
      {showSyncDetails && (
        <div className="sync-details">
          <div className="sync-details-content">
            <h4>Статус синхронизации</h4>
            
            {syncStatus && (
              <div className="status-message">
                {syncStatus}
              </div>
            )}
            
            <div className="sync-stats">
              <div className="stat">
                <span className="stat-label">Локальные изменения:</span>
                <span className="stat-value">{localChanges}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Обновления на сервере:</span>
                <span className="stat-value">{remoteChanges}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Последняя синхронизация:</span>
                <span className="stat-value">
                  {lastSync ? lastSync.toLocaleString() : 'никогда'}
                </span>
              </div>
            </div>
            
            <div className="auto-sync-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={autoSync}
                  onChange={onToggleAutoSync}
                />
                Автоматическая синхронизация (каждые 30 секунд)
              </label>
            </div>
            
            <div className="sync-actions">
              <button onClick={onSync} disabled={isSyncing} className="sync-now-btn">
                {isSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
              </button>
              
              <button 
                onClick={() => setShowSyncDetails(false)}
                className="close-details"
              >
                Скрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncManager;