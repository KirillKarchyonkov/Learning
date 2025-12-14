import React, { useState, useEffect, useCallback, useRef } from 'react';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import GithubSync from './components/GithubSync';
import DataManagement from './components/DataManagement';
import SyncManager from './components/SyncManager';
import './App.css';


// Утилиты для работы с GitHub API
class GitHubApi {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Кодировка строки в base64
  encodeToBase64(str) {
    try {
      // Используем TextEncoder для правильной работы с Unicode
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const binaryString = Array.from(data).map(byte => String.fromCharCode(byte)).join('');
      return btoa(binaryString);
    } catch (error) {
      // Fallback для старых браузеров
      return btoa(unescape(encodeURIComponent(str)));
    }
  }

  // Декодировка из base64
  decodeFromBase64(base64) {
    try {
      // Используем TextDecoder для правильной работы с Unicode
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    } catch (error) {
      // Fallback для старых браузеров
      return decodeURIComponent(escape(atob(base64)));
    }
  }

  // Улучшенная функция для работы с файлами
  async getFileContent(owner, repo, path, branch = 'main') {
    try {
      const response = await this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
      return response;
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
    const body = {
      message,
      content: this.encodeToBase64(content),
      branch,
      ...(sha && { sha })
    };

    return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async getCommits(owner, repo, branch = 'main', perPage = 10) {
    return this.request(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`);
  }

  async getRepo(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }
}


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
  const [repoInfo, setRepoInfo] = useState(null);
  
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
  const syncTimeoutRef = useRef(null);

  // Загрузка всех данных при монтировании
  useEffect(() => {
    loadAllData();
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
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
          loadRepoInfo(repo.owner, repo.name, savedToken);
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

  // Автоматическая синхронизация
  useEffect(() => {
    if (!autoSync || !githubToken || !gistId || !githubPermissions.hasGistAccess) return;

    const checkInterval = setInterval(() => {
      checkForRemoteChanges();
    }, 30000); // Каждые 30 секунд

    return () => clearInterval(checkInterval);
  }, [autoSync, githubToken, gistId, githubPermissions.hasGistAccess]);

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
        setGithubPermissions({
          hasGistAccess: true,
          hasRepoAccess: true
        });
      } catch {
        setGithubPermissions({
          hasGistAccess: false,
          hasRepoAccess: true
        });
      }
      
    } catch (error) {
      console.error('Ошибка проверки прав:', error);
      setGithubPermissions({ hasRepoAccess: false, hasGistAccess: false });
    }
  }, []);

  // Загрузка информации о репозитории
  const loadRepoInfo = async (owner, repo, token) => {
    try {
      const api = new GitHubApi(token);
      const info = await api.getRepo(owner, repo);
      setRepoInfo(info);
      
      // Загружаем коммиты
      const commits = await api.getCommits(owner, repo, repoConfig.branch);
      setRepoCommits(commits);
      
      if (commits.length > 0) {
        setLastCommitSha(commits[0].sha);
        localStorage.setItem('steplik-last-commit-sha', commits[0].sha);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о репозитории:', error);
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

  // Сохранение состояния навигации
  useEffect(() => {
    const lastState = {
      courseId: selectedCourseId,
      sectionId: selectedSectionId,
      tabId: selectedTabId
    };
    localStorage.setItem('steplik-last-state', JSON.stringify(lastState));
  }, [selectedCourseId, selectedSectionId, selectedTabId]);

  // Сохранение настроек
  useEffect(() => {
    if (githubToken) localStorage.setItem('steplik-github-token', githubToken);
    if (gistId) localStorage.setItem('steplik-gist-id', gistId);
    localStorage.setItem('steplik-auto-sync', autoSync.toString());
    if (repoConfig.owner) {
      localStorage.setItem('steplik-repo-config', JSON.stringify(repoConfig));
    }
  }, [githubToken, gistId, autoSync, repoConfig]);

  // При изменении токена проверяем права
  useEffect(() => {
    if (githubToken) {
      checkTokenPermissions(githubToken);
    }
  }, [githubToken, checkTokenPermissions]);

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

  // Проверка обновлений в Gist
  const checkForRemoteChanges = async () => {
    if (!githubToken || !gistId || !githubPermissions.hasGistAccess) return;
    
    try {
      const api = new GitHubApi(githubToken);
      const response = await api.request(`/gists/${gistId}`);
      
      const lastUpdated = new Date(response.updated_at);
      const lastLocalSync = localStorage.getItem('steplik-last-sync-time');
      
      if (!lastLocalSync || new Date(lastLocalSync) < lastUpdated) {
        setRemoteChanges(1);
        setSyncStatus(`🔄 Обновления в Gist (${lastUpdated.toLocaleTimeString()})`);
      }
    } catch (error) {
      console.error('Ошибка проверки Gist:', error);
    }
  };

  // ==================== GIST СИНХРОНИЗАЦИЯ ====================
  const syncWithGithubGist = async () => {
    if (!githubToken) {
      alert('Введите GitHub Personal Access Token в настройках');
      return;
    }
    
    if (!githubPermissions.hasGistAccess) {
      alert('Токену не хватает прав gist. Создайте новый токен с правами gist');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('Проверка изменений в Gist...');
    
    try {
      const api = new GitHubApi(githubToken);
      
      // Если нет gistId, создаем новый Gist
      if (!gistId) {
        await createNewGist(api);
      } else {
        // Проверяем, существует ли Gist
        const gistExists = await checkGistExists(api);
        if (!gistExists) {
          await createNewGist(api);
        } else {
          await handleGistUpdate(api);
        }
      }
      
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('steplik-last-sync-time', now.toISOString());
      localStorage.setItem('steplik-last-synced-data', JSON.stringify(courses));
      localStorage.setItem('steplik-last-sync', now.toISOString());
      
      setLocalChanges(0);
      setRemoteChanges(0);
      setSyncStatus('✅ Данные синхронизированы через Gist');
      
    } catch (error) {
      console.error('Ошибка синхронизации Gist:', error);
      setSyncStatus(`❌ Ошибка: ${error.message}`);
      alert(`Ошибка синхронизации: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkGistExists = async (api) => {
    try {
      await api.request(`/gists/${gistId}`);
      return true;
    } catch {
      return false;
    }
  };

  const createNewGist = async (api) => {
    const data = {
      courses,
      lastState: { selectedCourseId, selectedSectionId, selectedTabId },
      metadata: {
        version: '1.0',
        lastModified: new Date().toISOString(),
        totalCourses: courses.length,
        syncedFrom: 'Steplik Personal App'
      }
    };

    const response = await api.request('/gists', {
      method: 'POST',
      body: JSON.stringify({
        files: { 'steplik-data.json': { content: JSON.stringify(data, null, 2) } },
        description: 'Steplik Personal - данные курсов',
        public: false
      })
    });

    const newGistId = response.id;
    setGistId(newGistId);
    localStorage.setItem('steplik-gist-id', newGistId);
    
    return response;
  };

  const handleGistUpdate = async (api) => {
    const gist = await api.request(`/gists/${gistId}`);
    const gistUpdatedAt = new Date(gist.updated_at);
    const localUpdatedAt = new Date(localStorage.getItem('steplik-last-modified') || 0);
    const lastSyncTime = new Date(localStorage.getItem('steplik-last-sync-time') || 0);

    if (!gist.files['steplik-data.json']) {
      await updateGistData(api);
      return;
    }

    const gistContent = gist.files['steplik-data.json'].content;
    let gistData;
    try {
      gistData = JSON.parse(api.decodeFromBase64(gistContent));
    } catch (error) {
      console.error('Ошибка парсинга данных Gist:', error);
      throw new Error('Неверный формат данных в Gist');
    }

    // Проверяем конфликты
    if (gistUpdatedAt > lastSyncTime && localUpdatedAt > lastSyncTime) {
      setConflict({
        serverTime: gistUpdatedAt,
        localTime: localUpdatedAt,
        serverData: gistData.courses || [],
        localData: courses
      });
      throw new Error('Обнаружен конфликт изменений');
    } else if (gistUpdatedAt > lastSyncTime) {
      if (window.confirm('В Gist есть новые изменения. Загрузить их?')) {
        setCourses(gistData.courses || []);
        saveToLocalStorage(gistData.courses || []);
        if (gistData.lastState) {
          setSelectedCourseId(gistData.lastState.selectedCourseId);
          setSelectedSectionId(gistData.lastState.selectedSectionId);
          setSelectedTabId(gistData.lastState.selectedTabId);
        }
        setSyncStatus('✅ Данные загружены из Gist');
      }
    } else {
      await updateGistData(api);
    }
  };

  const updateGistData = async (api) => {
    const data = {
      courses,
      lastState: { selectedCourseId, selectedSectionId, selectedTabId },
      metadata: {
        version: '1.0',
        lastModified: new Date().toISOString(),
        totalCourses: courses.length,
        syncedFrom: 'Steplik Personal App'
      }
    };

    await api.request(`/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: { 'steplik-data.json': { content: JSON.stringify(data, null, 2) } }
      })
    });
  };

  // Загрузка данных из Gist
  const loadFromGithubGist = async () => {
    if (!githubToken || !gistId) {
      alert('Настройте синхронизацию Gist в первую очередь');
      return;
    }

    if (!window.confirm('Загрузить данные из GitHub Gist? Текущие данные будут заменены.')) {
      return;
    }

    setIsSyncing(true);
    try {
      const api = new GitHubApi(githubToken);
      const gist = await api.request(`/gists/${gistId}`);
      
      if (!gist.files['steplik-data.json']) {
        throw new Error('В Gist нет данных Steplik');
      }
      
      const content = gist.files['steplik-data.json'].content;
      const data = JSON.parse(api.decodeFromBase64(content));

      if (!data.courses) {
        throw new Error('Неверный формат данных в Gist');
      }

      setCourses(data.courses);
      saveToLocalStorage(data.courses);
      
      if (data.lastState) {
        setSelectedCourseId(data.lastState.selectedCourseId);
        setSelectedSectionId(data.lastState.selectedSectionId);
        setSelectedTabId(data.lastState.selectedTabId);
      }

      const now = new Date();
      setLastSync(now);
      localStorage.setItem('steplik-last-sync', now.toISOString());
      localStorage.setItem('steplik-last-sync-time', now.toISOString());
      localStorage.setItem('steplik-last-synced-data', JSON.stringify(data.courses));
      
      alert(`✅ Загружено ${data.courses.length} курсов из GitHub Gist!`);
      
    } catch (error) {
      console.error('Ошибка загрузки из Gist:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== GIT РЕПОЗИТОРИЙ ОПЕРАЦИИ ====================
  const performRealGitCommit = async (message = '') => {
    if (!githubApiRef.current || !repoConfig.owner || !repoConfig.name) {
      throw new Error('Репозиторий не настроен');
    }

    const commitMessage = message || generateCommitMessage();
    
    try {
      setGitStatus('💾 Создание коммита...');
      
      // Подготавливаем данные для сохранения
      const dataToSave = {
        courses,
        metadata: {
          lastModified: new Date().toISOString(),
          totalCourses: courses.length,
          totalSections: courses.reduce((acc, course) => acc + (course.sections?.length || 0), 0),
          commitMessage,
          appVersion: '1.0'
        }
      };
      
      const content = JSON.stringify(dataToSave, null, 2);
      
      // Проверяем существование файла
      let fileSha = null;
      try {
        const existingFile = await githubApiRef.current.getFileContent(
          repoConfig.owner,
          repoConfig.name,
          'steplik-courses.json',
          repoConfig.branch
        );
        if (existingFile) {
          fileSha = existingFile.sha;
        }
      } catch (error) {
        // Файл не существует - это нормально
      }
      
      // Создаем или обновляем файл
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
        githubSha: result.commit.sha,
        githubUrl: result.commit.html_url
      };
      
      const updatedHistory = [newCommit, ...gitHistory.slice(0, 9)];
      setGitHistory(updatedHistory);
      localStorage.setItem('steplik-git-history', JSON.stringify(updatedHistory));
      
      // Сохраняем как последний коммит
      localStorage.setItem('steplik-last-commit-data', JSON.stringify(courses));
      localStorage.setItem('steplik-last-commit-sha', result.commit.sha);
      localStorage.setItem('steplik-last-commit-time', new Date().toISOString());
      
      // Обновляем коммиты из репозитория
      await loadRepoInfo(repoConfig.owner, repoConfig.name, githubToken);
      
      setGitChanges([]);
      setGitStatus(`✅ Закоммичено: "${commitMessage}"`);
      
      // Показываем ссылку на коммит
      setTimeout(() => {
        if (result.commit.html_url) {
          if (window.confirm('Коммит создан! Открыть на GitHub?')) {
            window.open(result.commit.html_url, '_blank');
          }
        }
      }, 500);
      
      return { 
        success: true, 
        commit: newCommit,
        githubResult: result 
      };
      
    } catch (error) {
      console.error('Ошибка создания коммита:', error);
      
      let errorMessage = 'Ошибка при создании коммита';
      if (error.message.includes('409')) {
        errorMessage = 'Конфликт: файл был изменен. Сначала получите изменения.';
      } else if (error.message.includes('422')) {
        errorMessage = 'Ошибка валидации. Проверьте формат данных.';
      }
      
      setGitStatus(`❌ ${errorMessage}`);
      throw new Error(`${errorMessage}: ${error.message}`);
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

  // Push изменений
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
        return { 
          success: true, 
          data: { courses: [] },
          fileExists: false
        };
      }
      
      // Декодируем содержимое
      let decodedContent;
      try {
        decodedContent = githubApiRef.current.decodeFromBase64(fileContent.content);
      } catch (decodeError) {
        console.error('Ошибка декодирования:', decodeError);
        decodedContent = atob(fileContent.content);
      }
      
      // Парсим JSON
      let data;
      try {
        data = JSON.parse(decodedContent);
      } catch (parseError) {
        console.error('Ошибка парсинга:', parseError);
        const cleanedContent = decodedContent.replace(/^\uFEFF/, '').trim();
        data = JSON.parse(cleanedContent);
      }
      
      if (!data.courses) {
        data.courses = [];
      }
      
      // Обновляем информацию о репозитории
      await loadRepoInfo(repoConfig.owner, repoConfig.name, githubToken);
      
      return { 
        success: true, 
        data,
        fileContent,
        fileExists: true
      };
      
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      
      let errorMessage = 'Ошибка при получении данных';
      if (error.message.includes('404')) {
        errorMessage = 'Файл не найден в репозитории';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Ошибка авторизации. Проверьте токен';
      }
      
      setGitStatus(`❌ ${errorMessage}`);
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  };

  // Загрузка данных из репозитория
  const loadDataFromRepository = async () => {
    try {
      const result = await performGitPull();
      
      if (result.success && result.fileExists && result.data.courses) {
        // Используем улучшенное объединение
        const mergedCourses = mergeCourses(courses, result.data.courses);
        if (window.confirm(`Загрузить ${result.data.courses.length} курсов из репозитория и объединить с локальными (${courses.length})?`)) {
          setCourses(mergedCourses);
          saveToLocalStorage(mergedCourses);
          
          const now = new Date();
          setLastSync(now);
          localStorage.setItem('steplik-last-sync', now.toISOString());
          localStorage.setItem('steplik-last-sync-time', now.toISOString());
          
          checkGitStatus();
          
          alert(`✅ Успешно загружено и объединено. Всего курсов: ${mergedCourses.length}`);
          return true;
        }
      } else if (result.success && !result.fileExists) {
        alert('В репозитории нет данных. Создайте файл при первом коммите.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert(`❌ Ошибка загрузки: ${error.message}`);
      return false;
    }
  };

  // Git add + commit
  const gitAddAndCommit = async (customMessage = '') => {
    try {
      const result = await performRealGitCommit(customMessage);
      checkGitStatus();
      return result;
    } catch (error) {
      throw error;
    }
  };

  // УЛУЧШЕННАЯ ФУНКЦИЯ ОБЪЕДИНЕНИЯ КУРСОВ
  const mergeCourses = (localCourses, remoteCourses) => {
    // Создаем карту для быстрого доступа
    const courseMap = new Map();
    
    // Сначала добавляем все локальные курсы
    localCourses.forEach(course => {
      courseMap.set(course.id, {
        ...course,
        source: 'local',
        mergeTimestamp: new Date().toISOString()
      });
    });
    
    // Затем добавляем/обновляем удаленные курсы
    remoteCourses.forEach(remoteCourse => {
      const existingCourse = courseMap.get(remoteCourse.id);
      
      if (!existingCourse) {
        // Курс существует только на сервере - добавляем
        courseMap.set(remoteCourse.id, {
          ...remoteCourse,
          source: 'remote',
          mergeTimestamp: new Date().toISOString()
        });
      } else {
        // Курс существует и локально, и на сервере - объединяем
        const localCourse = existingCourse;
        
        // Определяем, какой курс новее
        const localTime = new Date(localCourse.updatedAt || localCourse.createdAt || 0);
        const remoteTime = new Date(remoteCourse.updatedAt || remoteCourse.createdAt || 0);
        
        let mergedCourse;
        
        if (remoteTime > localTime) {
          // Удаленный курс новее - используем его как основу
          mergedCourse = { ...remoteCourse };
          
          // Но сохраняем уникальные локальные разделы
          if (localCourse.sections && localCourse.sections.length > 0) {
            const sectionMap = new Map();
            
            // Добавляем все разделы из удаленного курса
            if (mergedCourse.sections) {
              mergedCourse.sections.forEach(section => {
                sectionMap.set(section.id, section);
              });
            }
            
            // Добавляем локальные разделы, которых нет в удаленном
            localCourse.sections.forEach(localSection => {
              if (!sectionMap.has(localSection.id)) {
                sectionMap.set(localSection.id, localSection);
              } else {
                // Раздел существует в обеих версиях - объединяем вкладки
                const existingSection = sectionMap.get(localSection.id);
                const tabMap = new Map();
                
                // Добавляем все вкладки из удаленного раздела
                if (existingSection.tabs) {
                  existingSection.tabs.forEach(tab => {
                    tabMap.set(tab.id, tab);
                  });
                }
                
                // Добавляем локальные вкладки, которых нет в удаленном
                if (localSection.tabs) {
                  localSection.tabs.forEach(localTab => {
                    if (!tabMap.has(localTab.id)) {
                      tabMap.set(localTab.id, localTab);
                    } else {
                      // Вкладка существует в обеих версиях - используем новую
                      const existingTab = tabMap.get(localTab.id);
                      const localTabTime = new Date(localTab.lastModified || localTab.createdAt || 0);
                      const existingTabTime = new Date(existingTab.lastModified || existingTab.createdAt || 0);
                      
                      if (localTabTime > existingTabTime) {
                        tabMap.set(localTab.id, localTab);
                      }
                    }
                  });
                }
                
                // Обновляем раздел с объединенными вкладками
                existingSection.tabs = Array.from(tabMap.values());
                sectionMap.set(localSection.id, existingSection);
              }
            });
            
            mergedCourse.sections = Array.from(sectionMap.values());
          }
        } else {
          // Локальный курс новее или такой же - используем его как основу
          mergedCourse = { ...localCourse };
          
          // Но добавляем уникальные разделы из удаленного
          if (remoteCourse.sections && remoteCourse.sections.length > 0) {
            const sectionMap = new Map();
            
            // Добавляем все разделы из локального курса
            if (mergedCourse.sections) {
              mergedCourse.sections.forEach(section => {
                sectionMap.set(section.id, section);
              });
            }
            
            // Добавляем удаленные разделы, которых нет локально
            remoteCourse.sections.forEach(remoteSection => {
              if (!sectionMap.has(remoteSection.id)) {
                sectionMap.set(remoteSection.id, remoteSection);
              } else {
                // Раздел существует в обеих версиях - объединяем вкладки
                const existingSection = sectionMap.get(remoteSection.id);
                const tabMap = new Map();
                
                // Добавляем все вкладки из локального раздела
                if (existingSection.tabs) {
                  existingSection.tabs.forEach(tab => {
                    tabMap.set(tab.id, tab);
                  });
                }
                
                // Добавляем удаленные вкладки, которых нет локально
                if (remoteSection.tabs) {
                  remoteSection.tabs.forEach(remoteTab => {
                    if (!tabMap.has(remoteTab.id)) {
                      tabMap.set(remoteTab.id, remoteTab);
                    } else {
                      // Вкладка существует в обеих версиях - используем новую
                      const existingTab = tabMap.get(remoteTab.id);
                      const remoteTabTime = new Date(remoteTab.lastModified || remoteTab.createdAt || 0);
                      const existingTabTime = new Date(existingTab.lastModified || existingTab.createdAt || 0);
                      
                      if (remoteTabTime > existingTabTime) {
                        tabMap.set(remoteTab.id, remoteTab);
                      }
                    }
                  });
                }
                
                // Обновляем раздел с объединенными вкладками
                existingSection.tabs = Array.from(tabMap.values());
                sectionMap.set(remoteSection.id, existingSection);
              }
            });
            
            mergedCourse.sections = Array.from(sectionMap.values());
          }
        }
        
        // Удаляем временные поля
        delete mergedCourse.source;
        delete mergedCourse.mergeTimestamp;
        
        courseMap.set(remoteCourse.id, mergedCourse);
      }
    });
    
    // Преобразуем карту обратно в массив
    const mergedCourses = Array.from(courseMap.values());
    
    // Сортируем по дате создания (новые вверху)
    return mergedCourses.sort((a, b) => {
      const timeA = new Date(b.createdAt || 0);
      const timeB = new Date(a.createdAt || 0);
      return timeB - timeA;
    });
  };

  const resolveConflict = (choice) => {
    if (!conflict) return;
    
    setIsSyncing(true);
    
    try {
      if (choice === 'local') {
        syncWithGithubGist().then(() => {
          setConflict(null);
          setSyncStatus('✅ Конфликт разрешен (локальные данные отправлены)');
        }).finally(() => setIsSyncing(false));
      } else if (choice === 'server') {
        setCourses(conflict.serverData);
        saveToLocalStorage(conflict.serverData);
        setConflict(null);
        setSyncStatus('✅ Конфликт разрешен (данные из Gist загружены)');
        setIsSyncing(false);
      } else if (choice === 'merge') {
        const merged = mergeCourses(conflict.localData, conflict.serverData);
        setCourses(merged);
        saveToLocalStorage(merged);
        syncWithGithubGist().then(() => {
          setConflict(null);
          setSyncStatus('✅ Конфликт разрешен (данные объединены)');
        }).finally(() => setIsSyncing(false));
      }
    } catch (error) {
      console.error('Ошибка разрешения конфликта:', error);
      alert(`❌ Ошибка разрешения конфликта: ${error.message}`);
      setIsSyncing(false);
    }
  };

  // Синхронизация с репозиторием (без конфликтов)
  const gitSyncWithRepo = async () => {
    if (!githubApiRef.current || !repoConfig.owner || !repoConfig.name) {
      alert('Репозиторий не настроен');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('🔄 Синхронизация с репозиторием...');
    
    try {
      // Получаем данные из репозитория
      const pullResult = await performGitPull();
      
      if (pullResult.success && pullResult.fileExists && pullResult.data.courses) {
        const remoteCourses = pullResult.data.courses || [];
        const localCourses = courses;
        
        // Всегда используем объединение вместо конфликтов
        const mergedCourses = mergeCourses(localCourses, remoteCourses);
        
        // Обновляем локальные данные
        setCourses(mergedCourses);
        saveToLocalStorage(mergedCourses);
        
        // Если есть изменения после объединения - коммитим
        const localDataStr = JSON.stringify(localCourses);
        const mergedDataStr = JSON.stringify(mergedCourses);
        
        if (localDataStr !== mergedDataStr) {
          // Были изменения в результате объединения
          await performRealGitCommit('🔄 Автоматическое объединение локальных и удаленных изменений');
          setSyncStatus('✅ Данные объединены и закоммичены');
        } else if (gitChanges.length > 0) {
          // Есть локальные изменения
          await performRealGitCommit();
          setSyncStatus('✅ Локальные изменения закоммичены');
        } else {
          // Данные уже синхронизированы
          setSyncStatus('✅ Данные синхронизированы');
        }
        
        alert(`✅ Синхронизация завершена. Объединено ${mergedCourses.length} курсов.`);
        
      } else if (pullResult.success && !pullResult.fileExists) {
        // Файла нет в репозитории
        if (courses.length > 0) {
          if (window.confirm('Создать файл в репозитории с текущими данными?')) {
            await performRealGitCommit('🎉 Первоначальный коммит данных курсов');
            setSyncStatus('✅ Файл создан в репозитории');
          } else {
            setSyncStatus('❌ Создание файла отменено');
          }
        } else {
          setSyncStatus('⚠️ Нет данных для сохранения в репозитории');
        }
      }
      
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      setSyncStatus(`❌ ${error.message}`);
      
      // Если конфликт, предлагаем просто объединить
      if (error.message.includes('Конфликт') || error.message.includes('409')) {
        if (window.confirm('Обнаружен конфликт. Автоматически объединить данные?')) {
          try {
            const pullResult = await performGitPull();
            if (pullResult.success && pullResult.data.courses) {
              const mergedCourses = mergeCourses(courses, pullResult.data.courses);
              setCourses(mergedCourses);
              saveToLocalStorage(mergedCourses);
              await performRealGitCommit('🔄 Автоматическое разрешение конфликта');
              setSyncStatus('✅ Конфликт разрешен, данные объединены');
            }
          } catch (mergeError) {
            console.error('Ошибка объединения:', mergeError);
            alert(`❌ Ошибка объединения: ${mergeError.message}`);
          }
        }
      } else {
        alert(`❌ Ошибка синхронизации: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== ОПЕРАЦИИ С КУРСАМИ ====================
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

  // ==================== ЭКСПОРТ/ИМПОРТ ====================
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
            onRepoSync={gitSyncWithRepo}
            autoSync={autoSync}
            onToggleAutoSync={() => setAutoSync(!autoSync)}
            hasGistAccess={githubPermissions.hasGistAccess}
            hasRepoAccess={githubPermissions.hasRepoAccess}
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
      
      {/* Конфликт изменений в Gist */}
      {conflict && (
        <div className="conflict-modal">
          <div className="conflict-content">
            <h3>⚠️ Обнаружен конфликт изменений в Gist</h3>
            <p>Изменения были сделаны в нескольких местах:</p>
            <div className="conflict-info">
              <div>
                <strong>В Gist:</strong>
                <p>{conflict.serverTime.toLocaleString()}</p>
                <p>Курсов: {conflict.serverData.length}</p>
              </div>
              <div>
                <strong>Локально:</strong>
                <p>{conflict.localTime.toLocaleString()}</p>
                <p>Курсов: {conflict.localData.length}</p>
              </div>
            </div>
            
            <div className="conflict-actions">
              <button onClick={() => resolveConflict('local')} className="local-btn">
                💻 Использовать локальные данные
              </button>
              <button onClick={() => resolveConflict('server')} className="server-btn">
                ☁️ Использовать данные из Gist
              </button>
              <button onClick={() => resolveConflict('merge')} className="merge-btn">
                🔄 Объединить
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                <h2>Персональный Stepik 📚</h2>
                <p>Создавайте, организуйте и синхронизируйте учебные материалы</p>
                
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
                  onPull={loadDataFromRepository}
                  onAddAndCommit={gitAddAndCommit}
                  onRepoSync={gitSyncWithRepo}
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                  gitStatus={gitStatus}
                  gitChanges={gitChanges}
                  gitHistory={gitHistory}
                  repoCommits={repoCommits}
                  lastCommitSha={lastCommitSha}
                  repoInfo={repoInfo}
                />
                
                <div className="welcome-tips">
                  <h3>💡 Возможности:</h3>
                  <ul>
                    <li>✅ Создание курсов с разделами и вкладками</li>
                    <li>✅ Добавление текста и видео (YouTube, VK)</li>
                    <li>✅ Синхронизация через GitHub Gist</li>
                    <li>✅ Коммиты и push/pull в GitHub репозиторий</li>
                    <li>✅ Экспорт/импорт данных в JSON</li>
                  </ul>
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