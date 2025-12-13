import React, { useState, useEffect } from 'react';

const GitSync = ({ 
  gitStatus, 
  gitChanges, 
  gitHistory,
  onCommit,
  onPush,
  onPull,
  onAddAndCommit,
  expanded = false,
  githubToken,
  repoOwner,
  repoName,
  repoBranch = 'main'
}) => {
  const [showGitPanel, setShowGitPanel] = useState(expanded);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [repoInfo, setRepoInfo] = useState(null);
  const [lastCommitSha, setLastCommitSha] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Проверяем настройки репозитория
  useEffect(() => {
    checkRepoConfiguration();
  }, [githubToken, repoOwner, repoName]);

  const checkRepoConfiguration = () => {
    const savedRepo = localStorage.getItem('steplik-git-repo');
    if (savedRepo) {
      const repo = JSON.parse(savedRepo);
      setRepoInfo(repo);
      setIsConfigured(!!(repo.owner && repo.name && repo.token));
    }
  };

  // Получаем информацию о репозитории
  const fetchRepoInfo = async () => {
    if (!githubToken || !repoOwner || !repoName) return;
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (response.ok) {
        const repoData = await response.json();
        setRepoInfo(repoData);
        
        // Получаем последний коммит
        const commitsResponse = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${repoBranch}`,
          {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (commitsResponse.ok) {
          const commitData = await commitsResponse.json();
          setLastCommitSha(commitData.sha);
        }
      }
    } catch (error) {
      console.error('Ошибка получения информации о репозитории:', error);
    }
  };

  // Создаем коммит через GitHub API
  const createGitCommit = async (message, content) => {
    if (!githubToken || !repoOwner || !repoName) {
      throw new Error('GitHub репозиторий не настроен');
    }

    try {
      // 1. Получаем текущее дерево
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${repoBranch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const treeData = await treeResponse.json();

      // 2. Создаем новое дерево с нашими файлами
      const newTreeResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            base_tree: treeData.sha,
            tree: [
              {
                path: 'steplik-courses.json',
                mode: '100644',
                type: 'blob',
                content: JSON.stringify(content, null, 2)
              }
            ]
          })
        }
      );

      const newTreeData = await newTreeResponse.json();

      // 3. Создаем коммит
      const commitResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            tree: newTreeData.sha,
            parents: [lastCommitSha || treeData.sha]
          })
        }
      );

      const commitData = await commitResponse.json();

      // 4. Обновляем ветку
      const updateRefResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${repoBranch}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sha: commitData.sha,
            force: false
          })
        }
      );

      if (updateRefResponse.ok) {
        setLastCommitSha(commitData.sha);
        return commitData;
      } else {
        throw new Error('Ошибка обновления ветки');
      }
    } catch (error) {
      console.error('Ошибка создания коммита:', error);
      throw error;
    }
  };

  // Загружаем данные из репозитория
  const pullFromRepo = async () => {
    if (!githubToken || !repoOwner || !repoName) {
      throw new Error('GitHub репозиторий не настроен');
    }

    try {
      // Получаем файл из репозитория
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/steplik-courses.json`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        // Декодируем base64 контент
        const content = JSON.parse(atob(fileData.content));
        return content;
      } else if (response.status === 404) {
        // Файл не существует - это нормально для нового репозитория
        return null;
      } else {
        throw new Error('Ошибка загрузки файла');
      }
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      throw error;
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() && gitChanges.length === 0) {
      alert('Нет изменений для коммита');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Вызываем родительский onCommit для локальной истории
      const result = await onCommit(commitMessage || undefined);
      setCommitMessage('');
      setShowCommitModal(false);
      return result;
    } catch (error) {
      console.error('Ошибка коммита:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAndCommit = async () => {
    if (gitChanges.length === 0) {
      alert('Нет изменений для коммита');
      return;
    }
    
    setIsProcessing(true);
    try {
      if (isConfigured) {
        // Реальный коммит в GitHub
        const coursesData = JSON.parse(localStorage.getItem('steplik-courses') || '[]');
        await createGitCommit(
          commitMessage || generateSuggestedMessage(),
          { 
            courses: coursesData,
            lastModified: new Date().toISOString()
          }
        );
      }
      
      // Локальный коммит
      await onAddAndCommit(commitMessage || undefined);
      setCommitMessage('');
      setShowCommitModal(false);
      
      alert('Изменения успешно закоммичены и отправлены в репозиторий!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePush = async () => {
    setIsProcessing(true);
    try {
      if (isConfigured) {
        // Реальный push в GitHub
        const coursesData = JSON.parse(localStorage.getItem('steplik-courses') || '[]');
        await createGitCommit(
          'Auto commit from Steplik',
          { 
            courses: coursesData,
            lastModified: new Date().toISOString()
          }
        );
        alert('Изменения успешно отправлены в репозиторий!');
      } else {
        await onPush();
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert(`Ошибка отправки: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    setIsProcessing(true);
    try {
      if (isConfigured) {
        // Реальный pull из GitHub
        const remoteData = await pullFromRepo();
        if (remoteData && remoteData.courses) {
          if (window.confirm('Загрузить данные из репозитория? Локальные данные будут заменены.')) {
            localStorage.setItem('steplik-courses', JSON.stringify(remoteData.courses));
            alert('Данные успешно загружены из репозитория! Перезагрузите страницу.');
            window.location.reload();
          }
        } else {
          alert('В репозитории нет данных или файл не найден');
        }
      } else {
        await onPull();
      }
    } catch (error) {
      console.error('Ошибка получения:', error);
      alert(`Ошибка получения: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const generateSuggestedMessage = () => {
    if (gitChanges.length === 0) return 'Обновление данных курсов';
    
    const addedCourses = gitChanges.filter(c => c.includes('Добавлен курс:')).length;
    const addedSections = gitChanges.filter(c => c.includes('Добавлен раздел:')).length;
    
    if (addedCourses > 0) return `Добавлен курс: ${addedCourses}`;
    if (addedSections > 0) return `Добавлен раздел в курс`;
    
    return 'Обновление курсов';
  };

  const openRepoSettings = () => {
    const repoUrl = prompt(
      'Введите URL вашего репозитория (например: https://github.com/username/repo-name)',
      repoInfo?.html_url || ''
    );
    
    if (repoUrl) {
      try {
        const url = new URL(repoUrl);
        const [, owner, name] = url.pathname.split('/');
        
        if (owner && name) {
          const repoConfig = {
            owner: owner,
            name: name.replace('.git', ''),
            url: repoUrl,
            token: githubToken
          };
          
          localStorage.setItem('steplik-git-repo', JSON.stringify(repoConfig));
          setRepoInfo(repoConfig);
          setIsConfigured(true);
          alert('Репозиторий настроен!');
        } else {
          throw new Error('Неверный формат URL');
        }
      } catch (error) {
        alert('Введите корректный URL репозитория');
      }
    }
  };

  if (!expanded) {
    return (
      <div className="git-sync-compact">
        <button 
          className="git-toggle-btn"
          onClick={() => setShowGitPanel(!showGitPanel)}
          title="Управление Git"
        >
          {gitChanges.length > 0 ? '📝' : '📁'} Git
          {gitChanges.length > 0 && (
            <span className="changes-count">{gitChanges.length}</span>
          )}
        </button>
        
        {showGitPanel && (
          <div className="git-panel-dropdown">
            {!isConfigured ? (
              <div className="repo-not-configured">
                <p>Репозиторий не настроен</p>
                <button onClick={openRepoSettings} className="configure-btn">
                  ⚙️ Настроить
                </button>
              </div>
            ) : (
              <>
                <div className="git-status">
                  <strong>Репозиторий:</strong> {repoInfo?.owner}/{repoInfo?.name}
                </div>
                
                {gitChanges.length > 0 && (
                  <div className="git-changes">
                    <strong>Изменения:</strong>
                    <ul>
                      {gitChanges.slice(0, 3).map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="git-actions">
                  <button 
                    onClick={() => setShowCommitModal(true)}
                    disabled={gitChanges.length === 0 || isProcessing}
                    className="git-commit-btn"
                  >
                    💾 Коммит
                  </button>
                  <button 
                    onClick={handlePush}
                    disabled={isProcessing}
                    className="git-push-btn"
                  >
                    🚀 Отправить
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="git-sync-panel">
      <div className="git-header" onClick={() => setShowGitPanel(!showGitPanel)}>
        <h3>📁 Управление Git</h3>
        <div className="git-header-status">
          {isConfigured ? (
            <>
              <span className="git-status-badge">
                📦 {repoInfo?.owner}/{repoInfo?.name}
              </span>
              {gitChanges.length > 0 && (
                <span className="changes-badge">
                  {gitChanges.length} изменений
                </span>
              )}
            </>
          ) : (
            <span className="warning-badge">⚠️ Не настроено</span>
          )}
          <span className="toggle-icon">{showGitPanel ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {showGitPanel && (
        <div className="git-content">
          {/* Настройка репозитория */}
          {!isConfigured && (
            <div className="git-section">
              <div className="setup-repo-card">
                <h4>⚙️ Настройка репозитория</h4>
                <p>Для работы с Git необходимо:</p>
                <ol>
                  <li>Создать репозиторий на GitHub</li>
                  <li>Создать Personal Access Token с правами repo</li>
                  <li>Ввести URL репозитория ниже</li>
                </ol>
                
                <button onClick={openRepoSettings} className="setup-repo-btn">
                  🔗 Настроить репозиторий
                </button>
                
                <div className="repo-help">
                  <p><strong>Пример URL:</strong> https://github.com/ваш-логин/steplik-data</p>
                  <p><strong>Требуемые права токена:</strong> repo (полный доступ к репозиториям)</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Статус и информация о репозитории */}
          {isConfigured && repoInfo && (
            <div className="git-section">
              <h4>📦 Репозиторий</h4>
              <div className="repo-info-card">
                <div className="repo-header">
                  <a 
                    href={repoInfo.url || `https://github.com/${repoInfo.owner}/${repoInfo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-link"
                  >
                    {repoInfo.owner}/{repoInfo.name}
                  </a>
                  <button onClick={() => setIsConfigured(false)} className="change-repo-btn">
                    ✏️ Изменить
                  </button>
                </div>
                <div className="repo-details">
                  <p><strong>Ветка:</strong> {repoBranch}</p>
                  <p><strong>Файл данных:</strong> steplik-courses.json</p>
                  {lastCommitSha && (
                    <p><strong>Последний коммит:</strong> {lastCommitSha.substring(0, 8)}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Статус и изменения */}
          <div className="git-section">
            <h4>📋 Статус</h4>
            <div className="git-status-card">
              <p><strong>Состояние:</strong> {gitStatus}</p>
              {gitChanges.length > 0 ? (
                <div className="changes-list">
                  <p><strong>Изменения для коммита:</strong></p>
                  <ul>
                    {gitChanges.map((change, index) => (
                      <li key={index}>• {change}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="no-changes">Нет изменений для коммита</p>
              )}
            </div>
          </div>
          
          {/* Действия Git */}
          {isConfigured && (
            <div className="git-section">
              <h4>⚡ Действия Git</h4>
              <div className="git-actions-grid">
                <button 
                  onClick={() => setShowCommitModal(true)}
                  disabled={gitChanges.length === 0 || isProcessing}
                  className="git-action-btn commit-btn"
                  title="Создать коммит (git commit)"
                >
                  <span className="git-icon">💾</span>
                  <span>Коммит</span>
                  <small>git commit -m"..."</small>
                </button>
                
                <button 
                  onClick={handleAddAndCommit}
                  disabled={gitChanges.length === 0 || isProcessing}
                  className="git-action-btn add-commit-btn"
                  title="Добавить и закоммитить (git add . && git commit)"
                >
                  <span className="git-icon">📝</span>
                  <span>Добавить и коммит</span>
                  <small>git add . && git commit</small>
                </button>
                
                <button 
                  onClick={handlePush}
                  disabled={isProcessing}
                  className="git-action-btn push-btn"
                  title="Отправить изменения (git push origin main)"
                >
                  <span className="git-icon">🚀</span>
                  <span>Отправить</span>
                  <small>git push origin main</small>
                </button>
                
                <button 
                  onClick={handlePull}
                  disabled={isProcessing}
                  className="git-action-btn pull-btn"
                  title="Получить изменения (git pull origin main)"
                >
                  <span className="git-icon">📥</span>
                  <span>Получить</span>
                  <small>git pull origin main</small>
                </button>
              </div>
              
              <div className="git-command-preview">
                <p><strong>Будет выполнено:</strong></p>
                <code className="git-command">
                  git add . && git commit -m"{commitMessage || generateSuggestedMessage()}" && git push origin {repoBranch}
                </code>
              </div>
            </div>
          )}
          
          {/* История коммитов */}
          {gitHistory.length > 0 && (
            <div className="git-section">
              <div className="history-header">
                <h4>📜 История коммитов</h4>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="toggle-history-btn"
                >
                  {showHistory ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showHistory && (
                <div className="commits-history">
                  {gitHistory.map((commit, index) => (
                    <div key={commit.id} className="commit-card">
                      <div className="commit-header">
                        <span className="commit-hash">#{commit.id.toString().slice(-6)}</span>
                        <span className="commit-date">{formatDate(commit.timestamp)}</span>
                      </div>
                      <p className="commit-message">{commit.message}</p>
                      <div className="commit-details">
                        <span className="courses-count">📚 {commit.coursesCount} курсов</span>
                        {commit.changes && commit.changes.length > 0 && (
                          <span className="changes-count">
                            📝 {commit.changes.length} изменений
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Модалка для коммита */}
      {showCommitModal && (
        <div className="modal-overlay" onClick={() => setShowCommitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💾 Создать коммит</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCommitModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Сообщение коммита:</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder={generateSuggestedMessage()}
                  className="commit-message-input"
                  autoFocus
                />
                <small className="hint">
                  Опишите, что было изменено
                </small>
              </div>
              
              {gitChanges.length > 0 && (
                <div className="changes-preview">
                  <p><strong>Изменения для коммита:</strong></p>
                  <ul>
                    {gitChanges.slice(0, 5).map((change, index) => (
                      <li key={index}>• {change}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="git-command-example">
                <p><strong>Будет выполнена команда:</strong></p>
                <code>
                  git add . && git commit -m"{commitMessage || generateSuggestedMessage()}" && git push origin {repoBranch}
                </code>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={handleAddAndCommit}
                  disabled={isProcessing || gitChanges.length === 0}
                  className="primary-btn"
                >
                  {isProcessing ? '🚀 Отправка...' : '📝 Добавить, коммитить и отправить'}
                </button>
                <button 
                  onClick={() => setShowCommitModal(false)}
                  className="cancel-btn"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitSync;