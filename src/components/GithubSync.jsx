import React, { useState } from 'react';

const GithubSync = ({ 
  githubToken, 
  setGithubToken, 
  gistId, 
  setGistId,
  onSync,
  onLoad,
  isSyncing 
}) => {
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSaveSettings = () => {
    if (githubToken) {
      localStorage.setItem('steplik-github-token', githubToken);
      if (gistId) {
        localStorage.setItem('steplik-gist-id', gistId);
      }
      alert('Настройки сохранены');
    }
  };

  const handleCreateToken = () => {
    window.open('https://github.com/settings/tokens/new?scopes=gist&description=Steplik%20Personal%20Sync', '_blank');
  };

  const handleClearSettings = () => {
    if (window.confirm('Очистить настройки GitHub?')) {
      localStorage.removeItem('steplik-github-token');
      localStorage.removeItem('steplik-gist-id');
      localStorage.removeItem('steplik-last-sync');
      setGithubToken('');
      setGistId('');
    }
  };

  return (
    <div className="github-sync-panel">
      <div className="sync-header" onClick={() => setShowAdvanced(!showAdvanced)}>
        <h3>☁️ Синхронизация с GitHub</h3>
        <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
      </div>
      
      {showAdvanced && (
        <div className="sync-content">
          <div className="form-group">
            <label htmlFor="githubToken">
              GitHub Personal Access Token:
              <button 
                type="button" 
                className="info-btn"
                onClick={handleCreateToken}
                title="Создать новый токен"
              >
                Как получить?
              </button>
            </label>
            <div className="input-with-button">
              <input
                type={showToken ? "text" : "password"}
                id="githubToken"
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
              Требуются права: gist (создание и управление Gist)
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="gistId">
              Gist ID (оставьте пустым для создания нового):
            </label>
            <input
              type="text"
              id="gistId"
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              placeholder="f47ac10b58cc4372a5670e02b2c3d479"
              className="gist-input"
            />
            <small className="hint">
              Один Gist ID для всех устройств
            </small>
          </div>
          
          <div className="sync-actions">
            <button 
              onClick={handleSaveSettings}
              className="save-settings-btn"
              disabled={!githubToken}
            >
              💾 Сохранить настройки
            </button>
            
            <button 
              onClick={onSync}
              disabled={isSyncing || !githubToken}
              className="sync-btn"
            >
              {gistId ? '🔄 Обновить Gist' : '☁️ Создать новый Gist'}
            </button>
            
            <button 
              onClick={onLoad}
              disabled={isSyncing || !githubToken || !gistId}
              className="load-btn"
            >
              📥 Загрузить из Gist
            </button>
            
            <button 
              onClick={handleClearSettings}
              className="clear-btn"
            >
              🗑️ Очистить настройки
            </button>
          </div>
          
          <div className="sync-help">
            <h4>Инструкция:</h4>
            <ol>
              <li>Создайте Personal Access Token на GitHub (права gist)</li>
              <li>Введите токен выше</li>
              <li>Нажмите "Создать новый Gist" для первого устройства</li>
              <li>Сохраните Gist ID где-нибудь</li>
              <li>На другом устройстве введите тот же токен и Gist ID</li>
              <li>Нажмите "Загрузить из Gist"</li>
            </ol>
            <div className="warning">
              ⚠️ Не делитесь токеном и Gist ID с другими!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubSync;