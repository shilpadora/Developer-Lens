import { FileNode, GitStats, PeriodicMetric } from '../types';

export class GitHubService {
  private static getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    const cleanToken = token?.trim();
    if (cleanToken) headers['Authorization'] = `token ${cleanToken}`;
    return headers;
  }

  static async fetchTree(owner: string, repo: string, token?: string): Promise<{ tree: FileNode[], defaultBranch: string }> {
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, { headers: this.getHeaders(token) });
    
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`GitHub Error 404: Repository not found. If this is a private repo, ensure your API token is valid and has "repo" scope.`);
      }
      throw new Error(`GitHub Error: ${repoRes.status}`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers: this.getHeaders(token) });
    const treeData = await treeRes.json();
    
    if (!treeRes.ok) {
      throw new Error(`Tree fetch failed: ${treeData.message || treeRes.status}`);
    }

    return { tree: this.buildHierarchy(treeData.tree), defaultBranch };
  }

  private static buildHierarchy(tree: any[]): FileNode[] {
    const root: FileNode[] = [];
    const map: Record<string, FileNode> = {};

    const filtered = (tree || []).filter(item => {
      const parts = item.path.split('/');
      return !parts.some((p: string) => 
        ['node_modules', '.git', 'dist', 'build', 'venv', '__pycache__', '.next', '.DS_Store'].includes(p)
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
            kind: isLast ? (item.type === 'tree' ? 'folder' : 'file') : 'folder',
            complexity: isLast && item.type === 'blob' ? this.getComplexity(item.size || 0) : 'low',
            children: isLast && item.type === 'blob' ? undefined : [],
            size: item.size
          };
          map[currentPath] = newNode;
          if (i === 0) root.push(newNode);
          else if (map[parentPath]) map[parentPath].children?.push(newNode);
        }
      });
    });
    return root;
  }

  private static getComplexity(size: number): 'low' | 'medium' | 'high' {
    if (size > 100000) return 'high';
    if (size > 30000) return 'medium';
    return 'low';
  }

  static async fetchStats(owner: string, repo: string, branch: string, token?: string): Promise<GitStats> {
    const fetchWithRetry = async (url: string) => {
      const res = await fetch(url, { headers: this.getHeaders(token) });
      if (res.status === 202) {
        await new Promise(r => setTimeout(r, 2000));
        return fetch(url, { headers: this.getHeaders(token) });
      }
      return res;
    };

    const [activityRes, contributorsRes, treeRes] = await Promise.all([
      fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`),
      fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`),
      fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: this.getHeaders(token) })
    ]);

    const emptyMetric = (): PeriodicMetric => ({ commits: 0, additions: 0, deletions: 0, contributors: [] });
    const periods = {
      today: emptyMetric(),
      thisWeek: emptyMetric(),
      thisMonth: emptyMetric(),
      thisYear: emptyMetric(),
      prevYear: emptyMetric(),
      total: emptyMetric()
    };

    let commitsChart: any[] = [];
    let monthlyActivity: any[] = [];

    if (activityRes.ok) {
      const data = await activityRes.json();
      if (Array.isArray(data)) {
        commitsChart = data.map((w: any) => ({
          date: new Date(w.week * 1000).toLocaleDateString(),
          count: w.total
        })).slice(-12);

        const now = Date.now() / 1000;
        data.forEach((w: any) => {
          const age = now - w.week;
          if (age < 86400 * 7) periods.thisWeek.commits += w.total;
          if (age < 86400 * 30) periods.thisMonth.commits += w.total;
          if (age < 86400 * 365) {
            periods.thisYear.commits += w.total;
            periods.total.commits += w.total;
          }
          if (age < 86400 * 7 && w.days) {
            periods.today.commits = w.days[new Date().getDay()] || 0;
          }
        });

        const monthMap: Record<string, number> = {};
        data.forEach((w: any) => {
          const m = new Date(w.week * 1000).toLocaleString('default', { month: 'short' });
          monthMap[m] = (monthMap[m] || 0) + w.total;
        });
        monthlyActivity = Object.entries(monthMap).map(([month, commits]) => ({ month, commits }));
      }
    }

    if (contributorsRes.ok) {
      const data = await contributorsRes.json();
      if (Array.isArray(data)) {
        const now = Date.now() / 1000;
        data.forEach((c: any) => {
          const author = c.author?.login || 'unknown';
          c.weeks?.forEach((w: any) => {
            const age = now - w.w;
            const updateMetric = (m: PeriodicMetric) => {
              m.additions += (w.a || 0);
              m.deletions += (w.d || 0);
              m.commits += (w.c || 0);
              let cont = m.contributors.find(x => x.author === author);
              if (!cont) {
                cont = { author, additions: 0, deletions: 0, commits: 0 };
                m.contributors.push(cont);
              }
              cont.additions += (w.a || 0);
              cont.deletions += (w.d || 0);
              cont.commits += (w.c || 0);
            };

            if (age < 86400 * 7) updateMetric(periods.thisWeek);
            if (age < 86400 * 30) updateMetric(periods.thisMonth);
            if (age < 86400 * 365) updateMetric(periods.thisYear);
            if (age >= 86400 * 365 && age < 86400 * 730) updateMetric(periods.prevYear);
            updateMetric(periods.total);
          });
        });
        
        Object.values(periods).forEach(p => {
          p.contributors.sort((a, b) => b.commits - a.commits);
        });
      }
    }

    const extensions: Record<string, number> = {};
    if (treeRes.ok) {
      const data = await treeRes.json();
      data.tree?.forEach((item: any) => {
        if (item.type === 'blob') {
          const ext = item.path.split('.').pop() || 'file';
          extensions[ext] = (extensions[ext] || 0) + 1;
        }
      });
    }

    return { 
      commits: commitsChart, 
      extensions, 
      monthlyActivity, 
      periods 
    };
  }

  static async getFile(owner: string, repo: string, path: string, token?: string): Promise<string> {
    try {
      // Correct path encoding for GitHub API
      const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/');
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, { 
        headers: this.getHeaders(token) 
      });
      
      if (!res.ok) {
        console.warn(`GitHub File Error: ${res.status} for ${path}`);
        return '';
      }
      
      const data = await res.json();
      if (!data.content) return '';
      
      // Robust base64 to UTF-8 decoding
      const binary = atob(data.content.replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) { 
      console.error("GitHub Retrieval Error:", e);
      return ''; 
    }
  }
}