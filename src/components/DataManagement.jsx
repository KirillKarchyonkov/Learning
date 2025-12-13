import React, { useState } from 'react';

const DataManagement = ({ onClose, onExport, onImport, onClearLocal, githubToken, gistId }) => {
  const [showDangerZone, setShowDangerZone] = useState(false);

  return (
    <div className="data-management-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      
      <div className="modal-content">
        <div className="modal-header">
          <h3>⚙️ Управление данными</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="data-section">
            <h4>📁 Резервное копирование</h4>
            <div className="button-group">
              <button onClick={onExport} className="export-btn">
                📤 Экспорт всех данных
              </button>
              <button onClick={onImport} className="import-btn">
                📥 Импорт из файла
              </button>
            </div>
            <p className="section-hint">
              Экспортируйте данные в файл .json для сохранения резервной копии
            </p>
          </div>
          
          <div className="data-section">
            <h4>☁️ Синхронизация с GitHub</h4>
            <div className="sync-info">
              <p>
                <strong>Статус:</strong> {githubToken ? '🔵 Настроено' : '⚪ Не настроено'}
              </p>
              {gistId && (
                <p>
                  <strong>Gist ID:</strong> 
                  <code className="gist-id">{gistId.substring(0, 12)}...</code>
                </p>
              )}
            </div>
            <p className="section-hint">
              Используйте GitHub для синхронизации между устройствами
            </p>
          </div>
          
          <div className="danger-zone">
            <button 
              className="danger-toggle"
              onClick={() => setShowDangerZone(!showDangerZone)}
            >
              {showDangerZone ? '▲' : '▼'} Опасная зона
            </button>
            
            {showDangerZone && (
              <div className="danger-content">
                <div className="warning-message">
                  ⚠️ Эти действия нельзя отменить
                </div>
                
                <button 
                  onClick={onClearLocal}
                  className="danger-btn"
                >
                  🗑️ Очистить все локальные данные
                </button>
                
                <p className="danger-hint">
                  Удалит все курсы, настройки и историю из этого браузера
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;