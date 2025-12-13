import React, { useState, useEffect } from 'react';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import GithubSync from './components/GithubSync';
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

  // Загрузка настроек и данных из localStorage
  useEffect(() => {
    // Загружаем сохраненный токен и Gist ID
    const savedToken = localStorage.getItem('steplik-github-token');
    const savedGistId = localStorage.getItem('steplik-gist-id');
    const savedLastSync = localStorage.getItem('steplik-last-sync');
    
    if (savedToken) setGithubToken(savedToken);
    if (savedGistId) setGistId(savedGistId);
    if (savedLastSync) setLastSync(new Date(savedLastSync));
    
    // Пытаемся загрузить данные
    loadData();
  }, []);

  const loadData = () => {
    try {
      // 1. Пробуем загрузить из localStorage
      const savedCourses = localStorage.getItem('steplik-courses');
      if (savedCourses) {
        const parsed = JSON.parse(savedCourses);
        setCourses(parsed);
        
        const lastState = localStorage.getItem('steplik-last-state');
        if (lastState) {
          const state = JSON.parse(lastState);
          setSelectedCourseId(state.courseId);
          setSelectedSectionId(state.sectionId);
          setSelectedTabId(state.tabId);
        }
      } else {
        // 2. Если нет в localStorage, пробуем загрузить пример
        initializeSampleData();
      }
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
      initializeSampleData();
    }
  };

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
                content: 'React - это JavaScript-библиотека для создания пользовательских интерфейсов.',
                videoUrl: 'https://www.youtube.com/embed/Ke90Tje7VS0',
                type: 'mixed'
              }
            ]
          }
        ]
      }
    ];
    setCourses(sampleCourses);
    saveToLocalStorage(sampleCourses);
  };

  // Сохранение в localStorage
  const saveToLocalStorage = (coursesToSave) => {
    try {
      localStorage.setItem('steplik-courses', JSON.stringify(coursesToSave));
      localStorage.setItem('steplik-last-modified', new Date().toISOString());
    } catch (e) {
      console.error('Ошибка сохранения в localStorage:', e);
    }
  };

  // Сохранение последнего состояния
  const saveLastState = () => {
    const lastState = {
      courseId: selectedCourseId,
      sectionId: selectedSectionId,
      tabId: selectedTabId
    };
    localStorage.setItem('steplik-last-state', JSON.stringify(lastState));
  };

  // Сохранение всех данных
  useEffect(() => {
    if (courses.length > 0) {
      saveToLocalStorage(courses);
    }
  }, [courses]);

  useEffect(() => {
    saveLastState();
  }, [selectedCourseId, selectedSectionId, selectedTabId]);

  // Сохранение настроек GitHub
  useEffect(() => {
    if (githubToken) {
      localStorage.setItem('steplik-github-token', githubToken);
    }
    if (gistId) {
      localStorage.setItem('steplik-gist-id', gistId);
    }
  }, [githubToken, gistId]);

  // Синхронизация с GitHub Gist
  const syncWithGithub = async () => {
    if (!githubToken) {
      alert('Пожалуйста, введите GitHub Personal Access Token');
      return;
    }
    
    setIsSyncing(true);
    try {
      // Если нет gistId, создаем новый
      if (!gistId) {
        await createNewGist();
      } else {
        await updateExistingGist();
      }
      
      setLastSync(new Date());
      localStorage.setItem('steplik-last-sync', new Date().toISOString());
      alert('Данные успешно синхронизированы с GitHub!');
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      alert(`Ошибка синхронизации: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const createNewGist = async () => {
    const data = {
      files: {
        'steplik-data.json': {
          content: JSON.stringify({
            courses,
            lastState: {
              courseId: selectedCourseId,
              sectionId: selectedSectionId,
              tabId: selectedTabId
            },
            metadata: {
              version: '1.0',
              lastModified: new Date().toISOString(),
              totalCourses: courses.length
            }
          }, null, 2)
        }
      },
      description: 'Steplik Personal - данные курсов',
      public: false
    };

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Ошибка создания Gist');
    }

    const result = await response.json();
    setGistId(result.id);
    localStorage.setItem('steplik-gist-id', result.id);
  };

  const updateExistingGist = async () => {
    const data = {
      files: {
        'steplik-data.json': {
          content: JSON.stringify({
            courses,
            lastState: {
              courseId: selectedCourseId,
              sectionId: selectedSectionId,
              tabId: selectedTabId
            },
            metadata: {
              version: '1.0',
              lastModified: new Date().toISOString(),
              totalCourses: courses.length
            }
          }, null, 2)
        }
      }
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Ошибка обновления Gist');
    }
  };

  // Загрузка данных из GitHub Gist
  const loadFromGithub = async () => {
    if (!githubToken || !gistId) {
      alert('Требуется GitHub Token и Gist ID');
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const gist = await response.json();
      const content = gist.files['steplik-data.json'].content;
      const data = JSON.parse(content);

      setCourses(data.courses);
      
      if (data.lastState) {
        setSelectedCourseId(data.lastState.courseId);
        setSelectedSectionId(data.lastState.sectionId);
        setSelectedTabId(data.lastState.tabId);
      }

      saveToLocalStorage(data.courses);
      setLastSync(new Date());
      localStorage.setItem('steplik-last-sync', new Date().toISOString());
      
      alert('Данные успешно загружены из GitHub!');
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert(`Ошибка загрузки: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Экспорт/импорт локально
  const exportData = () => {
    const data = {
      courses: courses,
      lastState: {
        courseId: selectedCourseId,
        sectionId: selectedSectionId,
        tabId: selectedTabId
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `steplik-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = exportFileName;
    link.click();
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.courses) {
            setCourses(data.courses);
            saveToLocalStorage(data.courses);
            
            if (data.lastState) {
              setSelectedCourseId(data.lastState.courseId);
              setSelectedSectionId(data.lastState.sectionId);
              setSelectedTabId(data.lastState.tabId);
            }
            alert('Данные успешно импортированы!');
          }
        } catch (error) {
          alert('Ошибка при импорте данных');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const clearLocalData = () => {
    if (window.confirm('Очистить локальные данные?')) {
      localStorage.removeItem('steplik-courses');
      localStorage.removeItem('steplik-last-state');
      setCourses([]);
      setSelectedCourseId(null);
      setSelectedSectionId(null);
      setSelectedTabId(null);
    }
  };

  const addCourse = () => {
    const newCourse = {
      id: Date.now(),
      title: `Новый курс ${courses.length + 1}`,
      description: 'Описание курса',
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCourses([...courses, newCourse]);
    setSelectedCourseId(newCourse.id);
  };

  const updateCourse = (courseId, updatedCourse) => {
    setCourses(courses.map(course => 
      course.id === courseId ? {
        ...updatedCourse,
        updatedAt: new Date().toISOString()
      } : course
    ));
  };

  const deleteCourse = (courseId) => {
    if (window.confirm('Удалить курс?')) {
      const updatedCourses = courses.filter(course => course.id !== courseId);
      setCourses(updatedCourses);
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
        setSelectedSectionId(null);
        setSelectedTabId(null);
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
          {lastSync && (
            <span className="last-sync-time">
              Синхронизировано: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="header-actions">
          <button className="add-course-btn" onClick={addCourse}>
            + Добавить курс
          </button>
          <div className="data-management">
            <button onClick={exportData} title="Экспортировать в файл">
              📤 Экспорт
            </button>
            <button onClick={importData} title="Импортировать из файла">
              📥 Импорт
            </button>
            <button 
              onClick={syncWithGithub}
              disabled={isSyncing}
              className={isSyncing ? 'syncing-btn' : 'sync-btn'}
              title="Синхронизировать с GitHub"
            >
              {isSyncing ? '🔄 Синхронизация...' : '☁️ Синхронизировать'}
            </button>
            <button 
              onClick={loadFromGithub}
              disabled={isSyncing || !gistId}
              title="Загрузить из GitHub"
            >
              📥 Из GitHub
            </button>
          </div>
        </div>
      </header>
      
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
            <h2>Персональный Stepik</h2>
            <p>Создайте курс или настройте синхронизацию</p>
            <button onClick={addCourse} className="create-first-btn">
              🚀 Создать курс
            </button>
            
            <GithubSync
              githubToken={githubToken}
              setGithubToken={setGithubToken}
              gistId={gistId}
              setGistId={setGistId}
              onSync={syncWithGithub}
              onLoad={loadFromGithub}
              isSyncing={isSyncing}
            />
            
            <div className="welcome-features">
              <h3>Синхронизация между устройствами:</h3>
              <ol>
                <li>Получите GitHub Personal Access Token</li>
                <li>Введите токен в форму слева</li>
                <li>Нажмите "Создать/Обновить Gist"</li>
                <li>На другом устройстве - введите тот же токен и Gist ID</li>
                <li>Нажмите "Загрузить из GitHub"</li>
              </ol>
            </div>
          </div>
        )}
      </div>
      
      <div className="data-status">
        <span>Локальное сохранение: {new Date().toLocaleTimeString()}</span>
        <span>Курсов: {courses.length}</span>
        <span>Gist ID: {gistId ? `${gistId.substring(0, 8)}...` : 'не настроен'}</span>
        <button onClick={clearLocalData} className="clear-local-btn">
          Очистить локальные данные
        </button>
      </div>
    </div>
  );
}

export default App;