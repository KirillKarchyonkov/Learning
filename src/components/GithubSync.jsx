import React, { useState } from 'react';

const GithubSync = ({ 
  githubToken,
  setGithubToken,
  permissions,
  repoConfig,
  setRepoConfig,
  courses,
  onSync,
  onCommit,
  isSyncing 
}) => {
  const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'git' | 'settings'
  const [showToken, setShowToken] = useState(false);

  const createTokenWithAllPermissions = () => {
    window.open(
      'https://github.com/settings/tokens/new?scopes=gist,repo&description=Steplik%20Personal',
      '_blank'
    );
  };

  const setupRepository = () => {
    const repoUrl = prompt(
      'Введите URL вашего репозитория (например: https://github.com/username/steplik-data)',
      repoConfig.url || ''
    );
    
    if (repoUrl) {
      try {
        const url = new URL(repoUrl);
        const [, owner, name] = url.pathname.split('/');
        
        if (owner && name) {
          const newRepoConfig = {
            owner,
            name: name.replace('.git', ''),
            url: repoUrl,
            branch: 'main'
          };
          
          localStorage.setItem('steplik-repo-config', JSON.stringify(newRepoConfig));
          setRepoConfig(newRepoConfig);
          alert('Репозиторий настроен!');
        }
      } catch (error) {
        alert('Введите корректный URL репозитория');
      }
    }
  };

  const performGitOperation = async (operation) => {
    if (!permissions.hasRepoAccess) {
      alert('Токену не хватает прав доступа к репозиториям');
      return;
    }
    
    if (!repoConfig.owner || !repoConfig.name) {
      alert('Сначала настройте репозиторий');
      return;
    }
    
    try {
      switch (operation) {
        case 'commit':
          await onCommit('Обновление курсов');
          break;
        case 'push':
          await pushToRepository();
          break;
        case 'pull':
          await pullFromRepository();
          break;
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const pushToRepository = async () => {
    // Реализация push через GitHub API
    // (код из предыдущего ответа)
  };

  const pullFromRepository = async () => {
    // Реализация pull через GitHub API
    // (код из предыдущего ответа)
  };

  return (
    <div className="github-unified-panel">
      <div className="github-tabs">
        <button 
          className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          🔄 Синхронизация
        </button>
        <button 
          className={`tab-btn ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          📁 Git операции
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Настройки
        </button>
      </div>
      
      <div className="github-content">
        {/* Вкладка синхронизации */}
        {activeTab === 'sync' && (
          <div className="sync-tab">
            <h3>🔄 Синхронизация между устройствами</h3>
            <p>Используйте GitHub Gist для хранения данных</p>
            
            {permissions.hasGistAccess ? (
              <div className="sync-actions">
                <button onClick={onSync} disabled={isSyncing}>
                  {isSyncing ? '🔄 Синхронизация...' : '☁️ Синхронизировать'}
                </button>
                <button onClick={() => alert('Загрузка из Gist')}>
                  📥 Загрузить с другого устройства
                </button>
              </div>
            ) : (
              <div className="no-permissions">
                <p>❌ Токену не хватает прав <strong>gist</strong></p>
                <button onClick={createTokenWithAllPermissions}>
                  🔑 Создать токен с нужными правами
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Вкладка Git операций */}
        {activeTab === 'git' && (
          <div className="git-tab">
            <h3>📁 Управление репозиторием</h3>
            
            {!repoConfig.owner ? (
              <div className="setup-repo">
                <p>Репозиторий не настроен</p>
                <button onClick={setupRepository} className="setup-repo-btn">
                  🔗 Настроить репозиторий
                </button>
              </div>
            ) : (
              <>
                <div className="repo-info">
                  <p><strong>Репозиторий:</strong> {repoConfig.owner}/{repoConfig.name}</p>
                  <p><strong>Ветка:</strong> {repoConfig.branch}</p>
                </div>
                
                <div className="git-operations">
                  <h4>Git операции:</h4>
                  <div className="git-buttons">
                    <button 
                      onClick={() => performGitOperation('commit')}
                      disabled={!permissions.hasRepoAccess || isSyncing}
                      className="git-btn commit-btn"
                    >
                      💾 Коммит изменений
                      <small>git add . && git commit -m"..."</small>
                    </button>
                    
                    <button 
                      onClick={() => performGitOperation('push')}
                      disabled={!permissions.hasRepoAccess || isSyncing}
                      className="git-btn push-btn"
                    >
                      🚀 Отправить в репозиторий
                      <small>git push origin main</small>
                    </button>
                    
                    <button 
                      onClick={() => performGitOperation('pull')}
                      disabled={!permissions.hasRepoAccess || isSyncing}
                      className="git-btn pull-btn"
                    >
                      📥 Получить из репозитория
                      <small>git pull origin main</small>
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {!permissions.hasRepoAccess && (
              <div className="permissions-warning">
                ⚠️ Для Git операций нужен токен с правами <strong>repo</strong>
              </div>
            )}
          </div>
        )}
        
        {/* Вкладка настроек */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>⚙️ Настройки GitHub</h3>
            
            <div className="token-settings">
              <label>GitHub Token:</label>
              <div className="token-input-group">
                <input
                  type={showToken ? "text" : "password"}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="token-input"
                />
                <button 
                  onClick={() => setShowToken(!showToken)}
                  className="toggle-visibility"
                >
                  {showToken ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              
              <button onClick={createTokenWithAllPermissions} className="create-token-full">
                🔗 Создать токен с полными правами (gist + repo)
              </button>
              
              <div className="permissions-info">
                <p><strong>Нужные права:</strong></p>
                <ul>
                  <li>✅ <strong>gist</strong> - для синхронизации между устройствами</li>
                  <li>✅ <strong>repo</strong> - для работы с репозиторием</li>
                </ul>
              </div>
            </div>
            
            <div className="repo-settings">
              <h4>Настройки репозитория:</h4>
              <button onClick={setupRepository} className="setup-repo-btn">
                {repoConfig.owner ? '✏️ Изменить репозиторий' : '🔗 Настроить репозиторий'}
              </button>
              
              {repoConfig.owner && (
                <div className="current-repo">
                  <p>Текущий: {repoConfig.owner}/{repoConfig.name}</p>
                  <a 
                    href={repoConfig.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="repo-link"
                  >
                    🔗 Открыть на GitHub
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GithubSync;