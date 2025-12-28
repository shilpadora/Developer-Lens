
import { FileNode, GitStats } from '../types';

export class GitHubService {
  private static getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    return headers;
  }

  static async fetchTree(owner: string, repo: string, token?: string): Promise<FileNode[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const response = await fetch(url, { headers: this.getHeaders(token) });
    
    if (!response.ok) {
      // Try master if main fails
      const altUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
      const altResponse = await fetch(altUrl, { headers: this.getHeaders(token) });
      if (!altResponse.ok) throw new Error('Repository branch not found (main/master)');
      const data = await altResponse.json();
      return this.transformTree(data.tree);
    }

    const data = await response.json();
    return this.transformTree(data.tree);
  }

  private static transformTree(tree: any[]): FileNode[] {
    const root: FileNode[] = [];
    const map: Record<string, FileNode> = {};

    const filteredTree = tree.filter(item => {
      const parts = item.path.split('/');
      return !parts.some((p: string) => 
        ['node_modules', '.git', 'dist', 'build', '.next', 'venv', '__pycache__'].includes(p)
      );
    });

    filteredTree.forEach(item => {
      const parts = item.path.split('/');
      let currentPath = '';
      
      parts.forEach((part: string, index: number) => {
        const isLast = index === parts.length - 1;
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map[currentPath]) {
          const newNode: FileNode = {
            name: part,
            path: currentPath,
            type: isLast ? item.type : 'tree',
            complexity: this.calculateComplexity(part, item.size || 0),
            children: isLast && item.type === 'tree' ? [] : (isLast ? undefined : []),
            size: isLast ? item.size : undefined
          };
          map[currentPath] = newNode;

          if (index === 0) {
            root.push(newNode);
          } else {
            const parent = map[parentPath];
            if (parent && parent.children) {
              parent.children.push(newNode);
            }
          }
        }
      });
    });

    return root;
  }

  private static calculateComplexity(name: string, size: number): 'low' | 'medium' | 'high' {
    if (size > 50000) return 'high';
    if (size > 10000) return 'medium';
    return 'low';
  }

  static async fetchStats(owner: string, repo: string, token?: string): Promise<GitStats> {
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, { headers: this.getHeaders(token) });
    const contributorsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`, { headers: this.getHeaders(token) });
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, { headers: this.getHeaders(token) });

    if (!commitsRes.ok || !contributorsRes.ok) return { commits: [], contributors: [], extensions: {} };

    const commitsData = await commitsRes.json();
    const contributorsData = await contributorsRes.json();
    const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };

    const commits = commitsData.map((week: any) => ({
      date: new Date(week.week * 1000).toLocaleDateString(),
      count: week.total
    })).slice(-12);

    const contributors = contributorsData.map((c: any) => ({
      author: c.author.login,
      commits: c.total,
      additions: c.weeks.reduce((acc: number, w: any) => acc + w.a, 0),
      deletions: c.weeks.reduce((acc: number, w: any) => acc + w.d, 0)
    })).sort((a: any, b: any) => b.commits - a.commits);

    const extensions: Record<string, number> = {};
    treeData.tree?.forEach((item: any) => {
      if (item.type === 'blob') {
        const ext = item.path.split('.').pop() || 'unknown';
        extensions[ext] = (extensions[ext] || 0) + 1;
      }
    });

    return { commits, contributors, extensions };
  }

  static async getFileContent(owner: string, repo: string, path: string, token?: string): Promise<string> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: this.getHeaders(token) });
    if (!res.ok) return '';
    const data = await res.json();
    return atob(data.content);
  }
}
