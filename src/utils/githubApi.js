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
  
    // Работа с репозиторием
    async getRepo(owner, repo) {
      return this.request(`/repos/${owner}/${repo}`);
    }
  
    async getFileContent(owner, repo, path, branch = 'main') {
      try {
        return await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
      } catch (error) {
        if (error.message.includes('404')) {
          return null; // Файл не существует
        }
        throw error;
      }
    }
  
    async createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
      const body = {
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch
      };
  
      if (sha) {
        body.sha = sha;
      }
  
      return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    }
  
    async getCommits(owner, repo, branch = 'main', perPage = 10) {
      return this.request(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`);
    }
  
    async getBranch(owner, repo, branch = 'main') {
      return this.request(`/repos/${owner}/${repo}/branches/${branch}`);
    }
  
    // Создание коммита с несколькими файлами
    async createCommit(owner, repo, treeData, message, parentSha, branch = 'main') {
      // 1. Создаем дерево
      const treeResponse = await this.request(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: parentSha,
          tree: treeData
        })
      });
  
      // 2. Создаем коммит
      const commitResponse = await this.request(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: treeResponse.sha,
          parents: [parentSha]
        })
      });
  
      // 3. Обновляем ветку
      await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sha: commitResponse.sha,
          force: false
        })
      });
  
      return commitResponse;
    }
  }