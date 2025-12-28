
export interface RepoProject {
  id: string;
  name: string;
  owner: string;
  url: string;
  lastSync: number;
  token?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  complexity: 'low' | 'medium' | 'high';
  children?: FileNode[];
  size?: number;
}

export interface Entity {
  name: string;
  fields: Array<{ name: string; type: string }>;
  relations: Array<{ target: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' }>;
}

export interface GitStats {
  commits: Array<{ date: string; count: number }>;
  contributors: Array<{ author: string; commits: number; additions: number; deletions: number }>;
  extensions: Record<string, number>;
}

export interface AnalysisResult {
  performance: string;
  architecture: string;
  codeQuality: string;
  stack: {
    frontend: string[];
    backend: string[];
    devops: string[];
  };
  sources: Array<{ title: string; uri: string }>;
}

export type ViewType = 'topology' | 'schema' | 'analytics' | 'insights';
