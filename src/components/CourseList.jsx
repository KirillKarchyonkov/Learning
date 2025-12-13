import React from 'react';

const CourseList = ({ courses, selectedCourseId, onSelectCourse, onDeleteCourse }) => {
  return (
    <div className="course-list">
      <h3>Мои курсы</h3>
      <div className="courses-container">
        {courses.map(course => (
          <div 
            key={course.id}
            className={`course-card ${selectedCourseId === course.id ? 'selected' : ''}`}
            onClick={() => onSelectCourse(course.id)}
          >
            <div className="course-card-header">
              <h4>{course.title}</h4>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Удалить курс?')) {
                    onDeleteCourse(course.id);
                  }
                }}
              >
                ×
              </button>
            </div>
            <p className="course-description">{course.description}</p>
            <div className="course-stats">
              <span>Разделов: {course.sections?.length || 0}</span>
            </div>
          </div>
        ))}
        
        {courses.length === 0 && (
          <div className="empty-state">
            <p>Нет созданных курсов</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseList;