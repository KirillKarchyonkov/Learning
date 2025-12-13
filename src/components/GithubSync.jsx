import React, { useState } from 'react';

const GithubSync = ({ 
  githubToken, 
  setGithubToken, 
  gistId, 
  setGistId,
  onSync,
  onLoad,
  isSyncing,
  lastSync 
}) => {
  const [showSettings, setShowSettings] = useState(!githubToken);
  const [showToken, setShowToken] = useState(false);

  const handleCreateToken = () => {
    window.open('https://github.com/settings/tokens/new?scopes=gist&description=Steplik%20Personal%20Sync', '_blank');
  };

  const handleClearSettings = () => {
    if (window.confirm('Сбросить настройки GitHub?')) {
      localStorage.removeItem('steplik-github-token');
      localStorage.removeItem('steplik-gist-id');
      setGithubToken('');
      setGistId('');
    }
  };

  if (!showSettings && githubToken) {
    return (
      <div className="github-sync-summary">
        <div className="sync-summary-header">
          <h4>☁️ Синхронизация настроена</h4>
          <button 
            onClick={() => setShowSettings(true)}
            className="edit-settings-btn"
          >
            Изменить
          </button>
        </div>
        
        <div className="sync-info">
          <p><strong>Статус:</strong> {gistId ? 'Подключено' : 'Требуется Gist'}</p>
          {gistId && (
            <p>
              <strong>Gist ID:</strong> 
              <code>{gistId.substring(0, 8)}...</code>
            </p>
          )}
          {lastSync && (
            <p>
              <strong>Последняя синхронизация:</strong>
              {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        
        <div className="sync-buttons">
          <button onClick={onSync} disabled={isSyncing || !gistId}>
            {isSyncing ? '🔄 Синхронизация...' : '☁️ Синхронизировать'}
          </button>
          <button onClick={onLoad} disabled={isSyncing || !gistId}>
            📥 Проверить обновления
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="github-sync-panel">
      <div className="sync-header" onClick={() => setShowSettings(!showSettings)}>
        <h3>☁️ Настройка синхронизации</h3>
        <span className="toggle-icon">{showSettings ? '▼' : '▶'}</span>
      </div>
      
      {showSettings && (
        <div className="sync-content">
          <div className="sync-instructions">
            <p><strong>Как это работает:</strong></p>
            <ol>
              <li>Создайте GitHub Personal Access Token (права gist)</li>
              <li>Введите токен ниже - он сохранится только в вашем браузере</li>
              <li>На первом устройстве нажмите "Создать Gist"</li>
              <li>На других устройствах введите тот же токен и Gist ID</li>
              <li>Изменения будут синхронизироваться автоматически</li>
            </ol>
          </div>
          
          <div className="form-group">
            <label>
              GitHub Personal Access Token:
              <button type="button" className="info-btn" onClick={handleCreateToken}>
                Создать токен
              </button>
            </label>
            <div className="input-with-button">
              <input
                type={showToken ? "text" : "password"}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="token-input"
              />
              <button 
                type="button"
                className="toggle-visibility"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Скрыть токен" : "Показать токен"}
              >
                {showToken ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small className="hint">
              Токен нужен только для доступа к вашему Gist
            </small>
          </div>
          
          {githubToken && (
            <div className="form-group">
              <label>Gist ID (если уже создан):</label>
              <input
                type="text"
                value={gistId}
                onChange={(e) => setGistId(e.target.value)}
                placeholder="Оставьте пустым для создания нового"
                className="gist-input"
              />
              <small className="hint">
                Один Gist ID для всех ваших устройств
              </small>
            </div>
          )}
          
          <div className="sync-actions">
            <button 
              onClick={() => {
                if (githubToken) {
                  localStorage.setItem('steplik-github-token', githubToken);
                  if (gistId) {
                    localStorage.setItem('steplik-gist-id', gistId);
                  }
                  setShowSettings(false);
                }
              }}
              disabled={!githubToken}
              className="save-settings-btn"
            >
              💾 Сохранить настройки
            </button>
            
            <button 
              onClick={() => onSync('create')}
              disabled={isSyncing || !githubToken}
              className="create-gist-btn"
            >
              {gistId ? '🔄 Обновить Gist' : '☁️ Создать Gist'}
            </button>
            
            <button 
              onClick={handleClearSettings}
              className="clear-btn"
            >
              🗑️ Сбросить
            </button>
          </div>
          
          <div className="sync-warning">
            <p>⚠️ <strong>Важно:</strong></p>
            <ul>
              <li>Не делитесь токеном и Gist ID с другими</li>
              <li>Токен хранится только в вашем браузере</li>
              <li>Для безопасности регулярно обновляйте токены</li>
              <li>Делайте резервные копии через экспорт</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubSync;