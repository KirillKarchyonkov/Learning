import React, { useState } from 'react';

const SyncManager = ({ 
  isSyncing, 
  lastSync, 
  syncStatus, 
  localChanges, 
  remoteChanges,
  onSync,
  onRepoSync,
  autoSync,
  onToggleAutoSync,
  hasGistAccess,
  hasRepoAccess
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
            {hasRepoAccess ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRepoSync();
                }}
                className="repo-sync-button"
                disabled={isSyncing}
                title="Синхронизировать с репозиторием"
              >
                📦
              </button>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSync();
                }}
                className="sync-button"
                disabled={isSyncing || !hasGistAccess}
                title="Синхронизировать через Gist"
              >
                🔄
              </button>
            )}
            
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
                <span className="stat-label">Доступ к Gist:</span>
                <span className="stat-value">
                  {hasGistAccess ? '✅' : '❌'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Доступ к репозиториям:</span>
                <span className="stat-value">
                  {hasRepoAccess ? '✅' : '❌'}
                </span>
              </div>
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
                  disabled={!hasGistAccess}
                />
                Автоматическая синхронизация Gist (каждые 30 секунд)
              </label>
              {!hasGistAccess && (
                <small className="hint">Требуется доступ к Gist</small>
              )}
            </div>
            
            <div className="sync-actions">
              {hasRepoAccess && (
                <button onClick={onRepoSync} disabled={isSyncing} className="repo-sync-now-btn">
                  {isSyncing ? 'Синхронизация...' : '📦 Синхронизировать репозиторий'}
                </button>
              )}
              
              {hasGistAccess && (
                <button onClick={onSync} disabled={isSyncing} className="gist-sync-now-btn">
                  {isSyncing ? 'Синхронизация...' : '🔄 Синхронизировать через Gist'}
                </button>
              )}
              
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