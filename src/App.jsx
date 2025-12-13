import React, { useState, useEffect, useCallback, useRef } from 'react';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import GithubSync from './components/GithubSync';
import DataManagement from './components/DataManagement';
import SyncManager from './components/SyncManager';
import { GitHubApi } from './utils/githubApi';
import './App.css';

function App() {
  // Состояние для данных курсов
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);
  
  // Состояние для UI
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  
  // Состояние для синхронизации Gist
  const [githubToken, setGithubToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastSave, setLastSave] = useState(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [localChanges, setLocalChanges] = useState(0);
  const [remoteChanges, setRemoteChanges] = useState(0);
  const [autoSync, setAutoSync] = useState(false);
  const [conflict, setConflict] = useState(null);
  
  // Состояние для Git операций (репозиторий)
  const [gitHistory, setGitHistory] = useState([]);
  const [gitStatus, setGitStatus] = useState('');
  const [gitChanges, setGitChanges] = useState([]);
  const [lastCommitSha, setLastCommitSha] = useState('');
  const [repoCommits, setRepoCommits] = useState([]);
  
  // Состояние для репозитория GitHub
  const [repoConfig, setRepoConfig] = useState({
    owner: '',
    name: '',
    branch: 'main',
    url: '',
    defaultBranch: 'main'
  });
  
  const [githubPermissions, setGithubPermissions] = useState({
    hasRepoAccess: false,
    hasGistAccess: false
  });

  // Ref для хранения экземпляра GitHub API
  const githubApiRef = useRef(null);

  // Загрузка всех данных при монтировании
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    try {
      // Загрузка курсов
      const savedCourses = localStorage.getItem('steplik-courses');
      if (savedCourses) {
        const parsed = JSON.parse(savedCourses);
        setCourses(parsed);
        setLastSave(new Date());
        
        // Восстановление последнего состояния
        const lastState = localStorage.getItem('steplik-last-state');
        if (lastState) {
          const state = JSON.parse(lastState);
          setSelectedCourseId(state.courseId);
          setSelectedSectionId(state.sectionId);
          setSelectedTabId(state.tabId);
        }
      } else {
        initializeSampleData();
      }
      
      // Загрузка токена GitHub
      const savedToken = localStorage.getItem('steplik-github-token');
      if (savedToken) {
        setGithubToken(savedToken);
        checkTokenPermissions(savedToken);
      }
      
      // Загрузка Gist ID
      const savedGistId = localStorage.getItem('steplik-gist-id');
      if (savedGistId) {
        setGistId(savedGistId);
      }
      
      // Загрузка времени последней синхронизации Gist
      const savedLastSync = localStorage.getItem('steplik-last-sync');
      if (savedLastSync) {
        setLastSync(new Date(savedLastSync));
      }
      
      // Загрузка автосинхронизации
      const savedAutoSync = localStorage.getItem('steplik-auto-sync');
      if (savedAutoSync) {
        setAutoSync(savedAutoSync === 'true');
      }
      
      // Загрузка истории Git
      const savedHistory = localStorage.getItem('steplik-git-history');
      if (savedHistory) {
        setGitHistory(JSON.parse(savedHistory));
      }
      
      // Загрузка конфигурации репозитория
      const savedRepo = localStorage.getItem('steplik-repo-config');
      if (savedRepo) {
        const repo = JSON.parse(savedRepo);
        setRepoConfig(repo);
        if (repo.owner && repo.name && savedToken) {
          loadRepoCommits(repo.owner, repo.name, repo.branch, savedToken);
        }
      }
      
      // Загрузка последнего SHA коммита
      const savedLastCommitSha = localStorage.getItem('steplik-last-commit-sha');
      if (savedLastCommitSha) {
        setLastCommitSha(savedLastCommitSha);
      }
      
      // Проверка Git статуса
      checkGitStatus();
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      initializeSampleData();
    }
  };

  // Инициализация GitHub API
  useEffect(() => {
    if (githubToken) {
      githubApiRef.current = new GitHubApi(githubToken);
    }
  }, [githubToken]);

  // Проверка прав токена
  const checkTokenPermissions = useCallback(async (token) => {
    if (!token) return;
    
    try {
      const api = new GitHubApi(token);
      // Проверяем доступ к API
      await api.request('/user');
      
      // Проверяем доступ к Gist
      try {
        await api.request('/gists');
        setGithubPermissions(prev => ({
          ...prev,
          hasGistAccess: true,
          hasRepoAccess: true
        }));
      } catch {
        setGithubPermissions(prev => ({
          ...prev,
          hasGistAccess: false,
          hasRepoAccess: true
        }));
      }
      
    } catch (error) {
      console.error('Ошибка проверки прав:', error);
      setGithubPermissions({ hasRepoAccess: false, hasGistAccess: false });
    }
  }, []);

  // Загрузка коммитов из репозитория
  const loadRepoCommits = async (owner, repo, branch, token) => {
    try {
      const api = new GitHubApi(token);
      const commits = await api.getCommits(owner, repo, branch);
      setRepoCommits(commits);
      
      if (commits.length > 0) {
        setLastCommitSha(commits[0].sha);
        localStorage.setItem('steplik-last-commit-sha', commits[0].sha);
      }
    } catch (error) {
      console.error('Ошибка загрузки коммитов:', error);
    }
  };

  // Инициализация примерных данных
  const initializeSampleData = () => {
    const sampleCourses = [
      {
        id: 1,
        title: 'React для начинающих',
        description: 'Изучите основы React с нуля',
        sections: [
          {
            id: 11,
            title: 'Введение в React',
            tabs: [
              {
                id: 111,
                title: 'Что такое React',
                content: 'React - это JavaScript-библиотека для создания пользовательских интерфейсов.\n\n**Основные преимущества:**\n- Компонентный подход\n- Виртуальный DOM\n- Односторонняя передача данных\n- JSX синтаксис',
                videoUrl: 'https://www.youtube.com/embed/Ke90Tje7VS0',
                type: 'mixed',
                createdAt: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];
    setCourses(sampleCourses);
    saveToLocalStorage(sampleCourses);
  };

  // Сохранение в localStorage
  const saveToLocalStorage = (coursesToSave) => {
    try {
      localStorage.setItem('steplik-courses', JSON.stringify(coursesToSave));
      const now = new Date();
      localStorage.setItem('steplik-last-modified', now.toISOString());
      setLastSave(now);
      
      checkGitStatus();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  // Автосохранение
  useEffect(() => {
    if (courses.length > 0) {
      saveToLocalStorage(courses);
    }
  }, [courses]);

  // Сохранение настроек
  useEffect(() => {
    if (githubToken) localStorage.setItem('steplik-github-token', githubToken);
    if (gistId) localStorage.setItem('steplik-gist-id', gistId);
    localStorage.setItem('steplik-auto-sync', autoSync.toString());
    if (repoConfig.owner) {
      localStorage.setItem('steplik-repo-config', JSON.stringify(repoConfig));
    }
  }, [githubToken, gistId, autoSync, repoConfig]);

  // Проверка Git статуса
  const checkGitStatus = () => {
    try {
      const lastCommitData = localStorage.getItem('steplik-last-commit-data');
      const currentData = JSON.stringify(courses);
      
      if (lastCommitData !== currentData) {
        const changes = calculateGitChanges(JSON.parse(lastCommitData || '[]'), courses);
        setGitChanges(changes);
        setGitStatus('📝 Есть изменения для коммита');
      } else {
        setGitStatus('✅ Все изменения закоммичены');
      }
    } catch (error) {
      console.error('Ошибка проверки статуса Git:', error);
    }
  };

  const calculateGitChanges = (oldData, newData) => {
    const changes = [];
    
    newData.forEach(newCourse => {
      const oldCourse = oldData.find(c => c.id === newCourse.id);
      if (!oldCourse) {
        changes.push(`Добавлен курс: "${newCourse.title}"`);
      }
    });
    
    oldData.forEach(oldCourse => {
      const newCourse = newData.find(c => c.id === oldCourse.id);
      if (!newCourse) {
        changes.push(`Удален курс: "${oldCourse.title}"`);
      }
    });
    
    newData.forEach(newCourse => {
      const oldCourse = oldData.find(c => c.id === newCourse.id);
      if (oldCourse && oldCourse.title !== newCourse.title) {
        changes.push(`Переименован курс: "${oldCourse.title}" → "${newCourse.title}"`);
      }
    });
    
    return changes.slice(0, 5);
  };

  // === РЕАЛЬНЫЕ GIT ОПЕРАЦИИ ЧЕРЕЗ GITHUB API ===

  // Коммит изменений в репозиторий
  const performRealGitCommit = async (message = '') => {
    if (!githubApiRef.current || !repoConfig.owner || !repoConfig.name) {
      throw new Error('Репозиторий не настроен');
    }

    const commitMessage = message || generateCommitMessage();
    
    try {
      setGitStatus('💾 Создание коммита...');
      
      // Получаем текущее содержимое файла
      let fileSha = null;
      try {
        const fileContent = await githubApiRef.current.getFileContent(
          repoConfig.owner,
          repoConfig.name,
          'steplik-courses.json',
          repoConfig.branch
        );
        if (fileContent) {
          fileSha = fileContent.sha;
        }
      } catch (error) {
        // Файл не существует - это нормально
      }
      
      // Создаем или обновляем файл
      const content = JSON.stringify({
        courses,
        metadata: {
          lastModified: new Date().toISOString(),
          totalCourses: courses.length,
          commitMessage
        }
      }, null, 2);
      
      const result = await githubApiRef.current.createOrUpdateFile(
        repoConfig.owner,
        repoConfig.name,
        'steplik-courses.json',
        content,
        commitMessage,
        repoConfig.branch,
        fileSha
      );
      
      // Обновляем локальную историю
      const newCommit = {
        id: Date.now(),
        message: commitMessage,
        timestamp: new Date().toISOString(),
        changes: gitChanges,
        coursesCount: courses.length,
        githubSha: result.commit.sha
      };
      
      const updatedHistory = [newCommit, ...gitHistory.slice(0, 9)];
      setGitHistory(updatedHistory);
      localStorage.setItem('steplik-git-history', JSON.stringify(updatedHistory));
      
      // Сохраняем как последний коммит
      localStorage.setItem('steplik-last-commit-data', JSON.stringify(courses));
      localStorage.setItem('steplik-last-commit-sha', result.commit.sha);
      
      // Обновляем коммиты
      await loadRepoCommits(repoConfig.owner, repoConfig.name, repoConfig.branch, githubToken);
      
      setGitChanges([]);
      setGitStatus(`✅ Закоммичено: "${commitMessage}"`);
      
      return { 
        success: true, 
        commit: newCommit,
        githubResult: result 
      };
      
    } catch (error) {
      console.error('Ошибка создания коммита:', error);
      setGitStatus('❌ Ошибка при создании коммита');
      throw error;
    }
  };

  // Push изменений (в нашем случае коммит уже включает push)
  const performGitPush = async () => {
    return performRealGitCommit('Auto push from Steplik');
  };

  // Pull изменений из репозитория
  const performGitPull = async () => {
    if (!githubApiRef.current || !repoConfig.owner || !repoConfig.name) {
      throw new Error('Репозиторий не настроен');
    }
    
    try {
      setGitStatus('📥 Получение данных из репозитория...');
      
      // Получаем файл из репозитория
      const fileContent = await githubApiRef.current.getFileContent(
        repoConfig.owner,
        repoConfig.name,
        'steplik-courses.json',
        repoConfig.branch
      );
      
      if (!fileContent) {
        throw new Error('Файл не найден в репозитории');
      }
      
      // Декодируем содержимое
      const content = atob(fileContent.content);
      const data = JSON.parse(content);
      
      if (!data.courses) {
        throw new Error('Неверный формат данных в репозитории');
      }
      
      // Обновляем коммиты
      await loadRepoCommits(repoConfig.owner, repoConfig.name, repoConfig.branch, githubToken);
      
      return { 
        success: true, 
        data,
        fileContent 
      };
      
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      setGitStatus('❌ Ошибка при получении данных');
      throw error;
    }
  };

  // Git add + commit
  const gitAddAndCommit = async (customMessage = '') => {
    try {
      const result = await performRealGitCommit(customMessage);
      
      // После успешного коммита проверяем статус
      checkGitStatus();
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Комбинированная операция: pull -> merge -> commit -> push
  const gitSyncWithRepo = async () => {
    if (!githubApiRef.current || !repoConfig.owner || !repoConfig.name) {
      alert('Репозиторий не настроен');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('Синхронизация с репозиторием...');
    
    try {
      // 1. Pull: получаем данные из репозитория
      const pullResult = await performGitPull();
      
      if (pullResult.success && pullResult.data) {
        const remoteData = pullResult.data;
        
        // Проверяем, есть ли отличия от локальных данных
        const localDataStr = JSON.stringify(courses);
        const remoteDataStr = JSON.stringify(remoteData.courses);
        
        if (localDataStr !== remoteDataStr) {
          // Есть отличия - предлагаем объединить
          if (window.confirm('В репозитории есть изменения. Объединить с локальными данными?')) {
            // Простое объединение: добавляем курсы которых нет локально
            const mergedCourses = [...courses];
            remoteData.courses.forEach(remoteCourse => {
              if (!mergedCourses.find(c => c.id === remoteCourse.id)) {
                mergedCourses.push(remoteCourse);
              }
            });
            
            setCourses(mergedCourses);
            saveToLocalStorage(mergedCourses);
            
            // 2. Commit: коммитим объединенные данные
            await performRealGitCommit('Merge with remote changes');
          }
        } else {
          // Данные одинаковые, просто коммитим локальные изменения
          if (gitChanges.length > 0) {
            await performRealGitCommit();
          } else {
            setSyncStatus('✅ Нет изменений для синхронизации');
          }
        }
      }
      
      setSyncStatus('✅ Синхронизация с репозиторием завершена');
      
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      setSyncStatus(`❌ Ошибка: ${error.message}`);
      alert(`Ошибка синхронизации: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const generateCommitMessage = () => {
    if (gitChanges.length === 0) return 'Обновление данных курсов';
    
    const addedCourses = gitChanges.filter(c => c.includes('Добавлен курс:')).length;
    const removedCourses = gitChanges.filter(c => c.includes('Удален курс:')).length;
    
    if (addedCourses > 0) return `Добавлено ${addedCourses} курс${addedCourses > 1 ? 'ов' : ''}`;
    if (removedCourses > 0) return `Удалено ${removedCourses} курс${removedCourses > 1 ? 'ов' : ''}`;
    
    return 'Обновление курсов';
  };

  // Операции с курсами (остаются без изменений)
  const addCourse = () => {
    const newCourse = {
      id: Date.now(),
      title: `Новый курс ${courses.length + 1}`,
      description: 'Описание курса',
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    setSelectedCourseId(newCourse.id);
    setLocalChanges(prev => prev + 1);
  };

  const updateCourse = (courseId, updatedCourse) => {
    setCourses(courses.map(course => 
      course.id === courseId ? {
        ...updatedCourse,
        updatedAt: new Date().toISOString(),
        version: (course.version || 1) + 1
      } : course
    ));
    setLocalChanges(prev => prev + 1);
  };

  const deleteCourse = (courseId) => {
    const courseToDelete = courses.find(c => c.id === courseId);
    if (window.confirm(`Удалить курс "${courseToDelete?.title}"?`)) {
      const updatedCourses = courses.filter(course => course.id !== courseId);
      setCourses(updatedCourses);
      setLocalChanges(prev => prev + 1);
      
      if (selectedCourseId === courseId) {
        setSelectedCourseId(updatedCourses[0]?.id || null);
        setSelectedSectionId(null);
        setSelectedTabId(null);
      }
    }
  };

  // Функции для Gist синхронизации (упрощенные)
  const syncWithGithubGist = async () => {
    // ... существующий код для Gist синхронизации ...
    alert('Gist синхронизация в разработке');
  };

  const loadFromGithubGist = async () => {
    // ... существующий код для загрузки из Gist ...
    alert('Загрузка из Gist в разработке');
  };

  // Экспорт/импорт
  const exportData = () => {
    const data = {
      courses,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalCourses: courses.length
      }
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steplik-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.courses && Array.isArray(data.courses)) {
          if (window.confirm(`Импортировать ${data.courses.length} курсов?`)) {
            setCourses(data.courses);
            saveToLocalStorage(data.courses);
            alert(`✅ Успешно импортировано ${data.courses.length} курсов!`);
          }
        } else {
          alert('❌ Неверный формат файла');
        }
      } catch (err) {
        alert('❌ Ошибка при импорте файла');
      }
    };
    
    input.click();
  };

  const clearLocalData = () => {
    if (window.confirm('Очистить все локальные данные?')) {
      localStorage.clear();
      setCourses([]);
      setSelectedCourseId(null);
      setSelectedSectionId(null);
      setSelectedTabId(null);
      setGithubToken('');
      setGistId('');
      setLastSync(null);
      setRepoConfig({ owner: '', name: '', branch: 'main', url: '' });
      alert('✅ Все данные очищены');
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Развернуть панель" : "Свернуть панель"}
          >
            {isSidebarCollapsed ? '☰' : '◀'}
          </button>
          <h1>Персональный Stepik</h1>
          
          <div className="header-info">
            {lastSave && (
              <span className="save-info" title="Последнее сохранение">
                💾 {lastSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {courses.length > 0 && (
              <span className="courses-count" title="Всего курсов">
                📚 {courses.length}
              </span>
            )}
            {gitChanges.length > 0 && (
              <span className="git-changes-badge" title="Изменения для коммита">
                📝 {gitChanges.length}
              </span>
            )}
            {repoConfig.owner && (
              <span className="repo-info-badge" title="Репозиторий">
                📦 {repoConfig.owner}/{repoConfig.name}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button className="add-course-btn" onClick={addCourse}>
            + Новый курс
          </button>
          
          <SyncManager
            isSyncing={isSyncing}
            lastSync={lastSync}
            syncStatus={syncStatus}
            localChanges={localChanges}
            remoteChanges={remoteChanges}
            onSync={syncWithGithubGist}
            autoSync={autoSync}
            onToggleAutoSync={() => setAutoSync(!autoSync)}
            hasGistAccess={githubPermissions.hasGistAccess}
            hasRepoAccess={githubPermissions.hasRepoAccess}
            onRepoSync={gitSyncWithRepo}
          />
          
          <button 
            className="data-management-btn"
            onClick={() => setShowDataManagement(!showDataManagement)}
            title="Управление данными"
          >
            ⚙️
          </button>
        </div>
      </header>
      
      {/* Модальное окно управления данными */}
      {showDataManagement && (
        <DataManagement
          onClose={() => setShowDataManagement(false)}
          onExport={exportData}
          onImport={importData}
          onClearLocal={clearLocalData}
          githubToken={githubToken}
          gistId={gistId}
          repoConfig={repoConfig}
          setRepoConfig={setRepoConfig}
        />
      )}
      
      <div className={`app-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <CourseList 
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={(id) => {
            setSelectedCourseId(id);
            setSelectedSectionId(null);
            setSelectedTabId(null);
          }}
          onDeleteCourse={deleteCourse}
          isCollapsed={isSidebarCollapsed}
        />
        
        <div className="main-content">
          {selectedCourse ? (
            <CourseViewer 
              course={selectedCourse}
              onUpdateCourse={updateCourse}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              selectedTabId={selectedTabId}
              onSelectTab={setSelectedTabId}
              onGitCommit={() => gitAddAndCommit(`Обновлен курс: "${selectedCourse.title}"`)}
            />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>Персональный Stepik с реальным Git 🚀</h2>
                <p>Создавайте курсы и управляйте ими через GitHub API</p>
                
                <div className="welcome-actions">
                  <button onClick={addCourse} className="primary-action">
                    🚀 Создать первый курс
                  </button>
                  
                  {courses.length > 0 && (
                    <button 
                      onClick={() => setSelectedCourseId(courses[0].id)}
                      className="secondary-action"
                    >
                      📖 Продолжить обучение
                    </button>
                  )}
                  
                  {gitChanges.length > 0 && (
                    <button 
                      onClick={() => gitAddAndCommit()}
                      className="git-commit-btn"
                      disabled={!repoConfig.owner}
                    >
                      📝 Закоммитить изменения ({gitChanges.length})
                    </button>
                  )}
                </div>
                
                {/* Компонент GitHub синхронизации */}
                <GithubSync
                  githubToken={githubToken}
                  setGithubToken={setGithubToken}
                  gistId={gistId}
                  setGistId={setGistId}
                  repoConfig={repoConfig}
                  setRepoConfig={setRepoConfig}
                  permissions={githubPermissions}
                  courses={courses}
                  onSync={syncWithGithubGist}
                  onLoad={loadFromGithubGist}
                  onCommit={performRealGitCommit}
                  onPush={performGitPush}
                  onPull={performGitPull}
                  onAddAndCommit={gitAddAndCommit}
                  onRepoSync={gitSyncWithRepo}
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                  gitStatus={gitStatus}
                  gitChanges={gitChanges}
                  gitHistory={gitHistory}
                  repoCommits={repoCommits}
                  lastCommitSha={lastCommitSha}
                />
                
                <div className="welcome-tips">
                  <h3>📋 Как настроить работу с Git:</h3>
                  <ol>
                    <li>
                      <strong>Создайте токен GitHub:</strong><br/>
                      <a href="https://github.com/settings/tokens/new?scopes=repo&description=Steplik%20Personal" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="github-link">
                        🔗 Создать токен с правами repo
                      </a>
                    </li>
                    <li>
                      <strong>Создайте репозиторий:</strong><br/>
                      <a href="https://github.com/new" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="github-link">
                        🔗 Создать новый репозиторий
                      </a>
                    </li>
                    <li>
                      <strong>Настройте в приложении:</strong><br/>
                      Введите токен и URL репозитория (например: https://github.com/ваш-логин/steplik-data)
                    </li>
                    <li>
                      <strong>Работайте:</strong><br/>
                      Создавайте курсы → нажимайте "Коммит" → изменения будут в вашем репозитории
                    </li>
                  </ol>
                  
                  <div className="github-repo-status">
                    {repoConfig.owner ? (
                      <>
                        <p><strong>Текущий репозиторий:</strong> {repoConfig.owner}/{repoConfig.name}</p>
                        <p><strong>Последний коммит:</strong> {lastCommitSha ? `${lastCommitSha.substring(0, 8)}...` : 'нет'}</p>
                        <p><strong>Коммитов в истории:</strong> {repoCommits.length}</p>
                      </>
                    ) : (
                      <p className="no-repo">Репозиторий не настроен</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;