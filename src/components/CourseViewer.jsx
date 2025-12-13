import React, { useState } from 'react';
import SectionEditor from './SectionEditor';
import ContentEditor from './ContentEditor';

const CourseViewer = ({ 
  course, 
  onUpdateCourse,
  selectedSectionId,
  onSelectSection,
  selectedTabId,
  onSelectTab
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);

  const selectedSection = course.sections?.find(s => s.id === selectedSectionId);
  const selectedTab = selectedSection?.tabs?.find(t => t.id === selectedTabId);

  const handleSaveCourse = () => {
    onUpdateCourse(course.id, {
      ...course,
      title,
      description
    });
    setIsEditingTitle(false);
  };

  const addSection = () => {
    const newSection = {
      id: Date.now(),
      title: `Новый раздел ${course.sections.length + 1}`,
      tabs: []
    };
    const updatedCourse = {
      ...course,
      sections: [...(course.sections || []), newSection]
    };
    onUpdateCourse(course.id, updatedCourse);
    onSelectSection(newSection.id);
  };

  const updateSection = (sectionId, updatedSection) => {
    const updatedSections = course.sections.map(section =>
      section.id === sectionId ? updatedSection : section
    );
    onUpdateCourse(course.id, { ...course, sections: updatedSections });
  };

  const deleteSection = (sectionId) => {
    const updatedSections = course.sections.filter(s => s.id !== sectionId);
    onUpdateCourse(course.id, { ...course, sections: updatedSections });
    if (selectedSectionId === sectionId) {
      onSelectSection(null);
      onSelectTab(null);
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
            <button onClick={handleSaveCourse}>Сохранить</button>
            <button onClick={() => {
              setIsEditingTitle(false);
              setTitle(course.title);
              setDescription(course.description);
            }}>Отмена</button>
          </div>
        ) : (
          <>
            <div>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
            </div>
            <button onClick={() => setIsEditingTitle(true)}>✏️ Редактировать</button>
          </>
        )}
      </div>

      <div className="course-content">
        <div className="sections-sidebar">
          <div className="sections-header">
            <h3>Разделы курса</h3>
            <button onClick={addSection} className="add-section-btn">
              + Добавить раздел
            </button>
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
                      if (window.confirm('Удалить раздел?')) {
                        deleteSection(section.id);
                      }
                    }}
                  >
                    ×
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
              />
              
              {selectedTab && (
                <ContentEditor
                  tab={selectedTab}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseViewer;