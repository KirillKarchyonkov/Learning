import React, { useState, useEffect } from 'react';
import CourseList from './components/CourseList';
import CourseViewer from './components/CourseViewer';
import './App.css';

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);

  // Загрузка данных из localStorage при загрузке
  useEffect(() => {
    const savedCourses = localStorage.getItem('steplik-courses');
    if (savedCourses) {
      try {
        setCourses(JSON.parse(savedCourses));
      } catch (e) {
        console.error('Ошибка загрузки данных:', e);
      }
    }
  }, []);

  // Сохранение в localStorage при изменении курсов
  useEffect(() => {
    localStorage.setItem('steplik-courses', JSON.stringify(courses));
  }, [courses]);

  const addCourse = () => {
    const newCourse = {
      id: Date.now(),
      title: `Новый курс ${courses.length + 1}`,
      description: 'Описание курса',
      sections: []
    };
    setCourses([...courses, newCourse]);
    setSelectedCourseId(newCourse.id);
  };

  const updateCourse = (courseId, updatedCourse) => {
    setCourses(courses.map(course => 
      course.id === courseId ? updatedCourse : course
    ));
  };

  const deleteCourse = (courseId) => {
    setCourses(courses.filter(course => course.id !== courseId));
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      setSelectedSectionId(null);
      setSelectedTabId(null);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Персональный Stepik</h1>
        <button className="add-course-btn" onClick={addCourse}>
          + Добавить курс
        </button>
      </header>
      
      <div className="app-content">
        <CourseList 
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={setSelectedCourseId}
          onDeleteCourse={deleteCourse}
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
            <h2>Добро пожаловать!</h2>
            <p>Создайте свой первый курс или выберите существующий</p>
            <button onClick={addCourse}>Создать первый курс</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;