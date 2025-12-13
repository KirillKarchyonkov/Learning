export class GitHubApi {
    constructor(token) {
      this.token = token;
      this.baseUrl = 'https://api.github.com';
    }
  
    async request(endpoint, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultHeaders = {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };
  
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API Error ${response.status}: ${errorText}`);
      }
  
      return response.json();
    }
  
    // Кодировка строки в base64
    encodeToBase64(str) {
      try {
        // Используем TextEncoder для правильной работы с Unicode
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const binaryString = Array.from(data).map(byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
      } catch (error) {
        // Fallback для старых браузеров
        return btoa(unescape(encodeURIComponent(str)));
      }
    }
  
    // Декодировка из base64
    decodeFromBase64(base64) {
      try {
        // Используем TextDecoder для правильной работы с Unicode
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
      } catch (error) {
        // Fallback для старых браузеров
        return decodeURIComponent(escape(atob(base64)));
      }
    }
  
    // Улучшенная функция для работы с файлами
    async getFileContent(owner, repo, path, branch = 'main') {
      try {
        const response = await this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
        return response;
      } catch (error) {
        if (error.message.includes('404')) {
          return null;
        }
        throw error;
      }
    }
  
    async createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
      const body = {
        message,
        content: this.encodeToBase64(content),
        branch,
        ...(sha && { sha })
      };
  
      return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    }
  
    async getCommits(owner, repo, branch = 'main', perPage = 10) {
      return this.request(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`);
    }
  
    // Получение дерева репозитория
    async getTree(owner, repo, branch = 'main') {
      const branchInfo = await this.request(`/repos/${owner}/${repo}/branches/${branch}`);
      const tree = await this.request(`/repos/${owner}/${repo}/git/trees/${branchInfo.commit.sha}?recursive=1`);
      return tree;
    }
  
    // Получение информации о пользователе
    async getUser() {
      return this.request('/user');
    }
  }