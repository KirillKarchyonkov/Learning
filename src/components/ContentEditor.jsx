import React, { useState, useEffect } from 'react';
import VideoEmbed from './VideoEmbed';

const ContentEditor = ({ tab, onUpdateTab }) => {
  const [content, setContent] = useState(tab.content || '');
  const [videoUrl, setVideoUrl] = useState(tab.videoUrl || '');
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    setContent(tab.content || '');
    setVideoUrl(tab.videoUrl || '');
  }, [tab.id]);

  const handleSave = () => {
    onUpdateTab({
      ...tab,
      content,
      videoUrl
    });
    setIsEditing(false);
  };

  const extractVideoId = (url) => {
    // Для YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return match ? match[1] : null;
    }
    // Для VK
    if (url.includes('vk.com')) {
      const match = url.match(/video-?\d+_\d+/);
      return match ? match[0] : null;
    }
    return null;
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('youtube') || pastedText.includes('youtu.be') || pastedText.includes('vk.com')) {
      setVideoUrl(pastedText);
      e.preventDefault();
    }
  };

  return (
    <div className="content-editor">
      <div className="content-editor-header">
        <h4>{tab.title}</h4>
        <div className="editor-actions">
          <button 
            onClick={() => setIsEditing(!isEditing)}
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
              onChange={(e) => setVideoUrl(e.target.value)}
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
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите текст урока..."
              rows={15}
            />
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
        </div>
      )}
    </div>
  );
};

export default ContentEditor;