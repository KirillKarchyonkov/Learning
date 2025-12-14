import React, { useState } from 'react';
import SectionEditor from './SectionEditor';
import ContentEditor from './ContentEditor';


const CourseViewer = ({ 
  course, 
  onUpdateCourse,
  selectedSectionId,
  onSelectSection,
  selectedTabId,
  onSelectTab,
  onGitCommit
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);


  const selectedSection = course.sections?.find(s => s.id === selectedSectionId);
  const selectedTab = selectedSection?.tabs?.find(t => t.id === selectedTabId);


  const handleSaveCourse = () => {
    const updatedCourse = {
      ...course,
      title,
      description,
      updatedAt: new Date().toISOString()
    };
    onUpdateCourse(course.id, updatedCourse);
    setIsEditingTitle(false);
    
    // Предлагаем закоммитить изменения
    if (onGitCommit && (title !== course.title || description !== course.description)) {
      setTimeout(() => {
        if (window.confirm('Закоммитить изменения в курсе?')) {
          onGitCommit();
        }
      }, 500);
    }
  };


  const addSection = () => {
    const newSection = {
      id: Date.now(),
      title: `Новый раздел ${course.sections.length + 1}`,
      tabs: [],
      createdAt: new Date().toISOString()
    };
    const updatedCourse = {
      ...course,
      sections: [...(course.sections || []), newSection],
      updatedAt: new Date().toISOString()
    };
    onUpdateCourse(course.id, updatedCourse);
    onSelectSection(newSection.id);
    
    // Предлагаем закоммитить
    if (onGitCommit) {
      setTimeout(() => {
        if (window.confirm('Закоммитить добавление раздела?')) {
          onGitCommit();
        }
      }, 500);
    }
  };


  const updateSection = (sectionId, updatedSection) => {
    const updatedSections = course.sections.map(section =>
      section.id === sectionId ? {
        ...updatedSection,
        updatedAt: new Date().toISOString()
      } : section
    );
    const updatedCourse = {
      ...course,
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    };
    onUpdateCourse(course.id, updatedCourse);
  };


  const deleteSection = (sectionId) => {
    const sectionToDelete = course.sections.find(s => s.id === sectionId);
    if (window.confirm(`Удалить раздел "${sectionToDelete?.title}"?`)) {
      const updatedSections = course.sections.filter(s => s.id !== sectionId);
      const updatedCourse = {
        ...course,
        sections: updatedSections,
        updatedAt: new Date().toISOString()
      };
      onUpdateCourse(course.id, updatedCourse);
      
      if (selectedSectionId === sectionId) {
        onSelectSection(null);
        onSelectTab(null);
      }
      
      // Предлагаем закоммитить
      if (onGitCommit) {
        setTimeout(() => {
          if (window.confirm('Закоммитить удаление раздела?')) {
            onGitCommit();
          }
        }, 500);
      }
    }
  };


  return (
    <div className="course-viewer">
      <div className="course-header">
        {isEditingTitle ? (
          <div className="edit-title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="description-input"
              placeholder="Описание курса"
            />
            <div className="edit-actions">
              <button onClick={handleSaveCourse}>💾 Сохранить</button>
              <button onClick={() => {
                setIsEditingTitle(false);
                setTitle(course.title);
                setDescription(course.description);
              }}>❌ Отмена</button>
            </div>
          </div>
        ) : (
          <>
            <div className="course-title-section">
              <h2>{course.title}</h2>
              <p className="course-description">{course.description}</p>
              <div className="course-meta">
                {course.createdAt && (
                  <span>Создан: {new Date(course.createdAt).toLocaleDateString()}</span>
                )}
                {course.updatedAt && (
                  <span>Обновлен: {new Date(course.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="course-actions">
              <button onClick={() => setIsEditingTitle(true)} title="Редактировать">
                ✏️
              </button>
              {onGitCommit && (
                <button 
                  onClick={onGitCommit}
                  className="git-commit-btn"
                  title="Закоммитить изменения курса"
                >
                  💾
                </button>
              )}
            </div>
          </>
        )}
      </div>


      <div className="course-content">
        <div className="sections-sidebar">
          <div className="sections-header">
            <h3>Разделы курса</h3>
            <div className="section-actions">
              <button onClick={addSection} className="add-section-btn">
                + Добавить раздел
              </button>
            </div>
          </div>
          
          <div className="sections-list">
            {course.sections?.map((section, index) => (
              <div 
                key={section.id}
                className={`section-item ${selectedSectionId === section.id ? 'selected' : ''}`}
              >
                <div 
                  className="section-header"
                  onClick={() => {
                    onSelectSection(section.id);
                    onSelectTab(null);
                  }}
                >
                  <span className="section-number">{index + 1}</span>
                  <span className="section-title">{section.title}</span>
                  <button 
                    className="delete-section-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(section.id);
                    }}
                    title="Удалить раздел"
                  >
                    🗑️
                  </button>
                </div>
                
                {selectedSectionId === section.id && section.tabs?.length > 0 && (
                  <div className="tabs-list">
                    {section.tabs.map(tab => (
                      <div 
                        key={tab.id}
                        className={`tab-item ${selectedTabId === tab.id ? 'selected' : ''}`}
                        onClick={() => onSelectTab(tab.id)}
                      >
                        {tab.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


        <div className="content-area">
          {selectedSection ? (
            <div className="section-content">
              <SectionEditor
                section={selectedSection}
                onUpdateSection={(updatedSection) => updateSection(selectedSection.id, updatedSection)}
                selectedTabId={selectedTabId}
                onSelectTab={onSelectTab}
                onGitCommit={onGitCommit}
              />
              
              {selectedTab && (
                <ContentEditor
                  tab={selectedTab}
                  sectionId={selectedSection.id} // ← ВОТ ЭТО ВАЖНОЕ ИЗМЕНЕНИЕ
                  onUpdateTab={(updatedTab) => {
                    const updatedTabs = selectedSection.tabs.map(t =>
                      t.id === selectedTab.id ? updatedTab : t
                    );
                    updateSection(selectedSection.id, { ...selectedSection, tabs: updatedTabs });
                  }}
                />
              )}
            </div>
          ) : (
            <div className="no-section-selected">
              <p>Выберите раздел слева или создайте новый</p>
              <button onClick={addSection} className="create-section-btn">
                + Создать первый раздел
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default CourseViewer;