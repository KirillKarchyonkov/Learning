import React, { useState } from 'react';

const SectionEditor = ({ section, onUpdateSection, selectedTabId, onSelectTab }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sectionTitle, setSectionTitle] = useState(section.title);

  const addTab = () => {
    const newTab = {
      id: Date.now(),
      title: `Новая вкладка ${section.tabs.length + 1}`,
      content: '',
      videoUrl: '',
      type: 'text'
    };
    const updatedSection = {
      ...section,
      tabs: [...(section.tabs || []), newTab]
    };
    onUpdateSection(updatedSection);
    onSelectTab(newTab.id);
  };

  const updateTab = (tabId, updatedTab) => {
    const updatedTabs = section.tabs.map(tab =>
      tab.id === tabId ? updatedTab : tab
    );
    onUpdateSection({ ...section, tabs: updatedTabs });
  };

  const deleteTab = (tabId) => {
    const updatedTabs = section.tabs.filter(t => t.id !== tabId);
    onUpdateSection({ ...section, tabs: updatedTabs });
    if (selectedTabId === tabId) {
      onSelectTab(null);
    }
  };

  const handleSaveTitle = () => {
    onUpdateSection({ ...section, title: sectionTitle });
    setIsEditingTitle(false);
  };

  return (
    <div className="section-editor">
      <div className="section-header-editor">
        {isEditingTitle ? (
          <div className="edit-section-title">
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              autoFocus
            />
            <button onClick={handleSaveTitle}>Сохранить</button>
            <button onClick={() => {
              setIsEditingTitle(false);
              setSectionTitle(section.title);
            }}>Отмена</button>
          </div>
        ) : (
          <h3 onClick={() => setIsEditingTitle(true)}>
            {section.title} ✏️
          </h3>
        )}
        <button onClick={addTab} className="add-tab-btn">
          + Добавить вкладку
        </button>
      </div>

      <div className="tabs-editor">
        <div className="tabs-list-editor">
          {section.tabs?.map(tab => (
            <div 
              key={tab.id}
              className={`tab-editor-item ${selectedTabId === tab.id ? 'selected' : ''}`}
            >
              <div className="tab-header">
                <span 
                  className="tab-title"
                  onClick={() => onSelectTab(tab.id)}
                >
                  {tab.title}
                </span>
                <div className="tab-actions">
                  <select
                    value={tab.type || 'text'}
                    onChange={(e) => updateTab(tab.id, { ...tab, type: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="text">📝 Текст</option>
                    <option value="video">🎥 Видео</option>
                    <option value="mixed">📝+🎥 Смешанный</option>
                  </select>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt('Новое название вкладки:', tab.title);
                      if (newTitle) {
                        updateTab(tab.id, { ...tab, title: newTitle });
                      }
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Удалить вкладку?')) {
                        deleteTab(tab.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionEditor;