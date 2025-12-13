import React from 'react';

const CourseList = ({ 
  courses, 
  selectedCourseId, 
  onSelectCourse, 
  onDeleteCourse,
  isCollapsed 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <div className="course-list-collapsed">
        <div className="collapsed-header">
          <h3>📚 Курсы</h3>
          <span className="courses-count">{courses.length}</span>
        </div>
        {courses.map(course => (
          <div 
            key={course.id}
            className={`collapsed-course ${selectedCourseId === course.id ? 'selected' : ''}`}
            onClick={() => onSelectCourse(course.id)}
            title={`${course.title}\n${course.description || ''}`}
          >
            {course.title.charAt(0)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="course-list">
      <div className="course-list-header">
        <h3>📚 Мои курсы</h3>
        <div className="courses-stats">
          <span className="count-badge">{courses.length}</span>
        </div>
      </div>
      
      <div className="courses-container">
        {courses.map(course => (
          <div 
            key={course.id}
            className={`course-card ${selectedCourseId === course.id ? 'selected' : ''}`}
            onClick={() => onSelectCourse(course.id)}
          >
            <div className="course-card-header">
              <div className="course-title-container">
                <h4>{course.title}</h4>
                {course.updatedAt && (
                  <span className="course-date">
                    {formatDate(course.updatedAt)}
                  </span>
                )}
              </div>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Удалить курс "${course.title}"?`)) {
                    onDeleteCourse(course.id);
                  }
                }}
                title="Удалить курс"
              >
                🗑️
              </button>
            </div>
            <p className="course-description">
              {course.description || 'Без описания'}
            </p>
            <div className="course-stats">
              <span className="stat-item">
                📁 {course.sections?.length || 0} разделов
              </span>
              {course.createdAt && (
                <span className="stat-item" title="Создан">
                  🗓️ {formatDate(course.createdAt)}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {courses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>Нет созданных курсов</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseList;