
export interface RepoProject {
  id: string;
  name: string;
  owner: string;
  url: string;
  lastSync: number;
  token?: string;
  tree?: FileNode[];
  stats?: GitStats;
  entities?: Entity[];
  aiData?: AnalysisResult;
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
  fields: Array<{ 
    name: string; 
    type: string; 
    isPrimaryKey?: boolean; 
    isForeignKey?: boolean;
    isUnique?: boolean;
    relatedTo?: string;
  }>;
  relations: Array<{ 
    target: string; 
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    name?: string; 
  }>;
  indexes?: string[];
}

export interface PeriodicMetric {
  commits: number;
  additions: number;
  deletions: number;
  contributors: Array<{
    author: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
}

export interface GitStats {
  commits: Array<{ date: string; count: number }>; // For the main chart
  extensions: Record<string, number>;
  monthlyActivity: Array<{ month: string; commits: number }>;
  periods: {
    today: PeriodicMetric;
    thisWeek: PeriodicMetric;
    thisMonth: PeriodicMetric;
    thisYear: PeriodicMetric;
    prevYear: PeriodicMetric;
    total: PeriodicMetric;
  };
}

export interface AnalysisResult {
  performance: string;
  architecture: string;
  codeQuality: string;
  stack: {
    frontend: string[];
    backend: string[];
    devops: string[];
    databases: string[];
  };
  libraries: {
    frontend: string[];
    backend: string[];
    devops: string[];
    databases: string[];
  };
  sources: Array<{ title: string; uri: string }>;
}

export type ViewType = 'stack' | 'topology' | 'schema' | 'analytics' | 'insights';
export type TimePeriod = 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'prevYear' | 'total';
