import { FileNode, GitStats } from '../types';

export class GitHubService {
  private static getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) headers['Authorization'] = `token ${token}`;
    return headers;
  }

  static async fetchTree(owner: string, repo: string, token?: string): Promise<{ tree: FileNode[], defaultBranch: string }> {
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, { headers: this.getHeaders(token) });
    if (!repoRes.ok) throw new Error('Repository not found');
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const response = await fetch(url, { headers: this.getHeaders(token) });
    if (!response.ok) throw new Error('Failed to fetch tree');
    
    const data = await response.json();
    return { tree: this.buildHierarchy(data.tree), defaultBranch };
  }

  private static buildHierarchy(tree: any[]): FileNode[] {
    const root: FileNode[] = [];
    const map: Record<string, FileNode> = {};

    const filtered = tree.filter(item => {
      const parts = item.path.split('/');
      return !parts.some((p: string) => 
        ['node_modules', '.git', 'dist', 'build', '.next', 'venv', '__pycache__', '.env'].includes(p)
      );
    });

    filtered.forEach(item => {
      const parts = item.path.split('/');
      let currentPath = '';

      parts.forEach((part: string, i: number) => {
        const isLast = i === parts.length - 1;
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map[currentPath]) {
          const newNode: FileNode = {
            name: part,
            path: currentPath,
            type: isLast ? item.type : 'tree',
            complexity: i === parts.length - 1 ? this.getComplexity(item.size || 0) : 'low',
            children: isLast && item.type === 'blob' ? undefined : [],
            size: item.size
          };
          map[currentPath] = newNode;

          if (i === 0) {
            root.push(newNode);
          } else if (map[parentPath]) {
            map[parentPath].children?.push(newNode);
          }
        }
      });
    });

    return root;
  }

  private static getComplexity(size: number): 'low' | 'medium' | 'high' {
    if (size > 50000) return 'high';
    if (size > 15000) return 'medium';
    return 'low';
  }

  static async fetchStats(owner: string, repo: string, branch: string, token?: string): Promise<GitStats> {
    const [commitsRes, contributorsRes, treeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, { headers: this.getHeaders(token) }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`, { headers: this.getHeaders(token) }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: this.getHeaders(token) })
    ]);

    let commits = [];
    if (commitsRes.ok) {
      const data = await commitsRes.json();
      commits = Array.isArray(data) ? data.map((w: any) => ({
        date: new Date(w.week * 1000).toLocaleDateString(),
        count: w.total
      })).slice(-12) : [];
    }

    let contributors = [];
    if (contributorsRes.ok) {
      const data = await contributorsRes.json();
      contributors = Array.isArray(data) ? data.map((c: any) => ({
        author: c.author.login,
        commits: c.total,
        additions: c.weeks.reduce((a: number, w: any) => a + w.a, 0),
        deletions: c.weeks.reduce((a: number, w: any) => a + w.d, 0)
      })).sort((a: any, b: any) => b.commits - a.commits) : [];
    }

    const extensions: Record<string, number> = {};
    if (treeRes.ok) {
      const data = await treeRes.json();
      data.tree?.forEach((item: any) => {
        if (item.type === 'blob') {
          const ext = item.path.split('.').pop() || 'unknown';
          extensions[ext] = (extensions[ext] || 0) + 1;
        }
      });
    }

    return { commits, contributors, extensions };
  }

  static async getFile(owner: string, repo: string, path: string, token?: string): Promise<string> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: this.getHeaders(token) });
    if (!res.ok) return '';
    const data = await res.json();
    const cleanBase64 = data.content.replace(/\s/g, '');
    try {
        return decodeURIComponent(escape(atob(cleanBase64)));
    } catch (e) {
        return atob(cleanBase64);
    }
  }
}