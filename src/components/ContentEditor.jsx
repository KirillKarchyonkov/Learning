import React, { useState, useEffect, useRef } from 'react';
import VideoEmbed from './VideoEmbed';

const ContentEditor = ({ tab, onUpdateTab, sectionId }) => {
  // Используем комбинированный ключ: sectionId + tab.id для сохранения состояния редактирования
  const [content, setContent] = useState(tab.content || '');
  const [videoUrl, setVideoUrl] = useState(tab.videoUrl || '');
  const [isEditing, setIsEditing] = useState(false); // По умолчанию режим просмотра
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const hasUnsavedChanges = useRef(false);

  // Состояние сохраняется в localStorage по ключу sectionId + tab.id
  const editingStateKey = `editing-${sectionId}-${tab.id}`;

  useEffect(() => {
    // Восстанавливаем состояние редактирования из localStorage
    const savedEditingState = localStorage.getItem(editingStateKey);
    const shouldBeEditing = savedEditingState === 'true';
    
    setIsEditing(shouldBeEditing);
    setContent(tab.content || '');
    setVideoUrl(tab.videoUrl || '');
    hasUnsavedChanges.current = false;
  }, [tab.id, sectionId]); // Зависимость от tab.id И sectionId

  // Сохраняем состояние редактирования в localStorage при изменении
  useEffect(() => {
    localStorage.setItem(editingStateKey, isEditing.toString());
  }, [isEditing, editingStateKey]);

  // Автосохранение при бездействии
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    if (hasUnsavedChanges.current && isEditing) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Сохранять через 2 секунды бездействия
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [content, videoUrl, isEditing]); // Добавили isEditing в зависимости

  const handleAutoSave = () => {
    if (hasUnsavedChanges.current) {
      onUpdateTab({
        ...tab,
        content,
        videoUrl,
        lastModified: new Date().toISOString()
      });
      setLastSaved(new Date());
      hasUnsavedChanges.current = false;
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    hasUnsavedChanges.current = true;
  };

  const handleVideoUrlChange = (newUrl) => {
    setVideoUrl(newUrl);
    hasUnsavedChanges.current = true;
  };

  const handleSave = () => {
    handleAutoSave();
    setIsEditing(false);
    // Удаляем состояние редактирования при сохранении
    localStorage.removeItem(editingStateKey);
  };

  const extractVideoId = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return match ? match[1] : null;
    }
    if (url.includes('vk.com')) {
      const match = url.match(/video-?\d+_\d+/);
      return match ? match[0] : null;
    }
    return null;
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('youtube') || pastedText.includes('youtu.be') || pastedText.includes('vk.com')) {
      handleVideoUrlChange(pastedText);
      e.preventDefault();
    }
  };

  // Очистка состояния редактирования при размонтировании компонента (необязательно)
  useEffect(() => {
    return () => {
      // Автосохранение перед уходом
      if (hasUnsavedChanges.current) {
        handleAutoSave();
      }
    };
  }, []);

  return (
    <div className="content-editor">
      <div className="content-editor-header">
        <div className="editor-title">
          <h4>{tab.title}</h4>
          {lastSaved && (
            <span className="last-saved">
              Сохранено: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="editor-actions">
          {hasUnsavedChanges.current && (
            <span className="unsaved-changes">Есть несохраненные изменения</span>
          )}
          <button 
            onClick={() => {
              setIsEditing(!isEditing);
              // При выходе из режима редактирования очищаем состояние
              if (isEditing) {
                localStorage.removeItem(editingStateKey);
              }
            }}
            className="toggle-edit-btn"
          >
            {isEditing ? '👁️ Просмотр' : '✏️ Редактировать'}
          </button>
          {isEditing && (
            <button onClick={handleSave} className="save-btn">
              💾 Сохранить
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="editor-mode">
          <div className="video-url-input">
            <label>Ссылка на видео (YouTube, VK):</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              onPaste={handlePaste}
              placeholder="Вставьте ссылку на видео"
            />
            {videoUrl && extractVideoId(videoUrl) && (
              <div className="video-preview">
                <VideoEmbed url={videoUrl} />
              </div>
            )}
          </div>

          <div className="text-content-input">
            <label>Текстовое содержание:</label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Введите текст урока..."
              rows={15}
            />
            <div className="formatting-hint">
              <small>Поддерживается HTML-разметка. Для новой строки используйте &lt;br&gt; или перенос строки.</small>
            </div>
          </div>
        </div>
      ) : (
        <div className="view-mode">
          {tab.type === 'video' || (tab.type === 'mixed' && videoUrl) ? (
            <div className="video-container">
              <VideoEmbed url={videoUrl} />
            </div>
          ) : null}
          
          {(tab.type === 'text' || tab.type === 'mixed') && content && (
            <div className="text-content">
              <div className="content-render" 
                dangerouslySetInnerHTML={{ 
                  __html: content.replace(/\n/g, '<br>') 
                }} 
              />
            </div>
          )}
          
          {!content && !videoUrl && (
            <div className="empty-content">
              <p>Пока здесь ничего нет. Нажмите "Редактировать", чтобы добавить контент.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentEditor;