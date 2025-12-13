import React, { useState, useEffect, useCallback } from 'react';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import GithubSync from './components/GithubSync';
import DataManagement from './components/DataManagement';
import SyncManager from './components/SyncManager';
import './App.css';

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastSave, setLastSave] = useState(null);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [localChanges, setLocalChanges] = useState(0);
  const [remoteChanges, setRemoteChanges] = useState(0);
  const [autoSync, setAutoSync] = useState(false);
  const [conflict, setConflict] = useState(null);

  // Загрузка данных и настроек
  useEffect(() => {
    const savedCourses = localStorage.getItem('steplik-courses');
    const savedToken = localStorage.getItem('steplik-github-token');
    const savedGistId = localStorage.getItem('steplik-gist-id');
    const savedLastSync = localStorage.getItem('steplik-last-sync');
    const savedAutoSync = localStorage.getItem('steplik-auto-sync');
    
    if (savedToken) setGithubToken(savedToken);
    if (savedGistId) setGistId(savedGistId);
    if (savedLastSync) setLastSync(new Date(savedLastSync));
    if (savedAutoSync) setAutoSync(savedAutoSync === 'true');
    
    if (savedCourses) {
      try {
        const parsed = JSON.parse(savedCourses);
        setCourses(parsed);
        setLastSave(new Date());
        
        const lastState = localStorage.getItem('steplik-last-state');
        if (lastState) {
          const state = JSON.parse(lastState);
          setSelectedCourseId(state.courseId);
          setSelectedSectionId(state.sectionId);
          setSelectedTabId(state.tabId);
        }
      } catch (e) {
        console.error('Ошибка загрузки:', e);
        initializeSampleData();
      }
    } else {
      initializeSampleData();
    }
    
    // Проверяем изменения при загрузке
    if (savedToken && savedGistId && savedAutoSync === 'true') {
      setTimeout(() => checkForRemoteChanges(), 2000);
    }
  }, []);

  // Автосохранение и подсчет изменений
  useEffect(() => {
    if (courses.length > 0) {
      saveToLocalStorage(courses);
      
      // Считаем непосинхронизированные изменения
      const lastSyncTime = localStorage.getItem('steplik-last-sync-time');
      if (lastSyncTime) {
        const coursesData = JSON.stringify(courses);
        const lastSyncedData = localStorage.getItem('steplik-last-synced-data');
        if (coursesData !== lastSyncedData) {
          const changes = countChanges(courses, lastSyncedData);
          setLocalChanges(changes);
        }
      }
    }
  }, [courses]);

  // Сохранение состояния
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
  }, [githubToken, gistId, autoSync]);

  // Периодическая проверка изменений (каждые 30 секунд при автосинхронизации)
  useEffect(() => {
    if (!autoSync || !githubToken || !gistId) return;
    
    const interval = setInterval(() => {
      checkForRemoteChanges();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoSync, githubToken, gistId]);

  const initializeSampleData = () => {
    const sampleCourses = [
      {
        id: 1,
        title: 'React для начинающих',
        description: 'Изучите основы React с нуля',
        sections: [],
        createdAt: new Date().toISOString()
      }
    ];
    setCourses(sampleCourses);
    saveToLocalStorage(sampleCourses);
  };

  const saveToLocalStorage = (coursesToSave) => {
    try {
      localStorage.setItem('steplik-courses', JSON.stringify(coursesToSave));
      const now = new Date();
      localStorage.setItem('steplik-last-modified', now.toISOString());
      setLastSave(now);
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  };

  const countChanges = (currentData, lastSyncedData) => {
    if (!lastSyncedData) return 1;
    try {
      const current = JSON.stringify(currentData);
      const last = JSON.parse(lastSyncedData);
      return current === JSON.stringify(last) ? 0 : 1;
    } catch {
      return 1;
    }
  };

  // Проверка изменений на сервере
  const checkForRemoteChanges = async () => {
    if (!githubToken || !gistId) return;
    
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const gist = await response.json();
        const lastUpdated = new Date(gist.updated_at);
        const lastLocalSync = localStorage.getItem('steplik-last-sync-time');
        
        if (!lastLocalSync || new Date(lastLocalSync) < lastUpdated) {
          setRemoteChanges(1);
          setSyncStatus(`Обновления на сервере (${lastUpdated.toLocaleTimeString()})`);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки:', error);
    }
  };

  // Умная синхронизация - определяет направление
  const smartSync = async () => {
    if (!githubToken) {
      alert('Настройте GitHub синхронизацию');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('Проверка изменений...');
    
    try {
      // 1. Получаем данные с сервера
      const serverData = await fetchGithubData();
      if (!serverData) {
        // Первая синхронизация - просто заливаем свои данные
        await pushToGithub();
        return;
      }
      
      // 2. Сравниваем время изменений
      const serverTime = new Date(serverData.metadata.lastModified);
      const localTime = new Date(localStorage.getItem('steplik-last-modified') || 0);
      const lastSyncTime = new Date(localStorage.getItem('steplik-last-sync-time') || 0);
      
      // 3. Логика разрешения конфликтов
      if (serverTime > lastSyncTime && localTime > lastSyncTime) {
        // Изменения на обоих концах - конфликт
        setConflict({
          serverTime,
          localTime,
          serverData: serverData.courses,
          localData: courses
        });
        setSyncStatus('Обнаружен конфликт изменений');
      } else if (serverTime > lastSyncTime) {
        // Только на сервере есть изменения
        setSyncStatus('Загрузка изменений с сервера...');
        await mergeData(serverData.courses, 'server');
      } else if (localTime > lastSyncTime) {
        // Только локально есть изменения
        setSyncStatus('Отправка изменений на сервер...');
        await pushToGithub();
      } else {
        setSyncStatus('Нет изменений для синхронизации');
      }
      
      setLocalChanges(0);
      setRemoteChanges(0);
      
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      setSyncStatus(`Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchGithubData = async () => {
    if (!gistId) return null;
    
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки данных');
    
    const gist = await response.json();
    const content = gist.files['steplik-data.json'].content;
    return JSON.parse(content);
  };

  const pushToGithub = async () => {
    const data = {
      courses,
      metadata: {
        lastModified: new Date().toISOString(),
        totalCourses: courses.length,
        deviceId: localStorage.getItem('steplik-device-id') || 'unknown'
      }
    };
    
    const response = await fetch(gistId ? 
      `https://api.github.com/gists/${gistId}` :
      'https://api.github.com/gists', {
      method: gistId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: { 'steplik-data.json': { content: JSON.stringify(data, null, 2) } },
        description: 'Steplik Personal - данные курсов',
        public: false
      })
    });
    
    if (!response.ok) throw new Error('Ошибка отправки данных');
    
    const result = await response.json();
    if (!gistId) {
      setGistId(result.id);
      localStorage.setItem('steplik-gist-id', result.id);
    }
    
    // Сохраняем состояние после синхронизации
    const now = new Date();
    setLastSync(now);
    localStorage.setItem('steplik-last-sync-time', now.toISOString());
    localStorage.setItem('steplik-last-synced-data', JSON.stringify(courses));
    
    setSyncStatus('Синхронизировано ✓');
    return result;
  };

  // Умное слияние данных
  const mergeData = async (serverCourses, source) => {
    const mergedCourses = [...courses];
    
    serverCourses.forEach(serverCourse => {
      const localIndex = mergedCourses.findIndex(c => c.id === serverCourse.id);
      
      if (localIndex === -1) {
        // Новый курс с сервера
        mergedCourses.push(serverCourse);
      } else {
        // Курс существует, проверяем что новее
        const localCourse = mergedCourses[localIndex];
        const serverTime = new Date(serverCourse.updatedAt || serverCourse.createdAt);
        const localTime = new Date(localCourse.updatedAt || localCourse.createdAt);
        
        if (serverTime > localTime) {
          // Данные с сервера новее
          mergedCourses[localIndex] = serverCourse;
        }
        // Если локальные данные новее, оставляем их
      }
    });
    
    // Также добавляем курсы, которые есть только локально
    courses.forEach(localCourse => {
      if (!serverCourses.find(c => c.id === localCourse.id)) {
        // Этот курс есть только локально
        if (!mergedCourses.find(c => c.id === localCourse.id)) {
          mergedCourses.push(localCourse);
        }
      }
    });
    
    setCourses(mergedCourses);
    saveToLocalStorage(mergedCourses);
    
    // После загрузки тоже обновляем синхронизацию
    const now = new Date();
    setLastSync(now);
    localStorage.setItem('steplik-last-sync-time', now.toISOString());
    localStorage.setItem('steplik-last-synced-data', JSON.stringify(mergedCourses));
    
    setSyncStatus(`Загружено из ${source === 'server' ? 'GitHub' : 'локального файла'} ✓`);
  };

  const resolveConflict = (choice) => {
    if (!conflict) return;
    
    if (choice === 'local') {
      // Используем локальные данные
      pushToGithub();
    } else if (choice === 'server') {
      // Используем серверные данные
      setCourses(conflict.serverData);
      saveToLocalStorage(conflict.serverData);
    } else if (choice === 'merge') {
      // Пытаемся объединить
      const merged = [...conflict.localData];
      
      conflict.serverData.forEach(serverCourse => {
        const existing = merged.find(c => c.id === serverCourse.id);
        if (!existing) {
          merged.push(serverCourse);
        }
      });
      
      setCourses(merged);
      saveToLocalStorage(merged);
      pushToGithub();
    }
    
    setConflict(null);
  };

  // Основные операции
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
    setCourses([...courses, newCourse]);
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
    if (window.confirm('Удалить курс?')) {
      setCourses(courses.filter(course => course.id !== courseId));
      setLocalChanges(prev => prev + 1);
      if (selectedCourseId === courseId) {
        setSelectedCourseId(courses.length > 1 ? courses[0].id : null);
      }
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
            {localChanges > 0 && (
              <span className="changes-badge" title="Непосинхронизированные изменения">
                📝 {localChanges}
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
            onSync={smartSync}
            autoSync={autoSync}
            onToggleAutoSync={() => setAutoSync(!autoSync)}
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
      
      {/* Конфликт модалка */}
      {conflict && (
        <div className="conflict-modal">
          <div className="conflict-content">
            <h3>⚠️ Обнаружен конфликт изменений</h3>
            <p>Изменения были сделаны на нескольких устройствах:</p>
            <div className="conflict-info">
              <div>
                <strong>На сервере:</strong>
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
                ☁️ Использовать данные с сервера
              </button>
              <button onClick={() => resolveConflict('merge')} className="merge-btn">
                🔄 Объединить (рекомендуется)
              </button>
            </div>
            
            <p className="conflict-hint">
              "Объединить" добавит новые курсы с обоих источников
            </p>
          </div>
        </div>
      )}
      
      {showDataManagement && (
        <DataManagement
          onClose={() => setShowDataManagement(false)}
          onExport={() => {
            const dataStr = JSON.stringify({
              courses,
              metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                totalCourses: courses.length
              }
            }, null, 2);
            
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `steplik-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImport={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
              const file = e.target.files[0];
              const text = await file.text();
              try {
                const data = JSON.parse(text);
                if (data.courses) {
                  if (window.confirm(`Импортировать ${data.courses.length} курсов?`)) {
                    await mergeData(data.courses, 'file');
                  }
                }
              } catch (err) {
                alert('Ошибка при импорте файла');
              }
            };
            
            input.click();
          }}
          onClearLocal={() => {
            if (window.confirm('Очистить все локальные данные?')) {
              localStorage.clear();
              setCourses([]);
              setSelectedCourseId(null);
              setGithubToken('');
              setGistId('');
              setLastSync(null);
            }
          }}
          githubToken={githubToken}
          gistId={gistId}
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
            />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>Добро пожаловать в персональный Stepik! 📚</h2>
                <p>Создавайте и синхронизируйте учебные материалы между устройствами</p>
                
                <div className="welcome-actions">
                  <button onClick={addCourse} className="primary-action">
                    🚀 Создать первый курс
                  </button>
                  
                  {githubToken ? (
                    <button onClick={smartSync} className="sync-action" disabled={isSyncing}>
                      {isSyncing ? '🔄 Синхронизация...' : '☁️ Проверить обновления'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowDataManagement(true)}
                      className="setup-sync-btn"
                    >
                      ⚙️ Настроить синхронизацию
                    </button>
                  )}
                </div>
                
                <GithubSync
                  githubToken={githubToken}
                  setGithubToken={setGithubToken}
                  gistId={gistId}
                  setGistId={setGistId}
                  onSync={smartSync}
                  onLoad={() => checkForRemoteChanges()}
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                />
                
                <div className="welcome-tips">
                  <h3>🔄 Как работает синхронизация:</h3>
                  <ul>
                    <li><strong>Автоматическая:</strong> при включенной опции проверяет обновления каждые 30 секунд</li>
                    <li><strong>Умное слияние:</strong> автоматически объединяет изменения с разных устройств</li>
                    <li><strong>Конфликты:</strong> при одновременном редактировании предложит варианты</li>
                    <li><strong>Безопасность:</strong> все данные хранятся в вашем приватном GitHub Gist</li>
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