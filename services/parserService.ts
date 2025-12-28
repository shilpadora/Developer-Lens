import { Entity, FileNode, AnalysisResult } from '../types';

export class ParserService {
  static parseSchema(content: string, type: 'prisma' | 'python'): Entity[] {
    if (type === 'prisma') return this.parsePrisma(content);
    if (type === 'python') return this.parseDjango(content);
    return [];
  }

  private static parsePrisma(content: string): Entity[] {
    const entities: Entity[] = [];
    const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\}/g;
    let match;
    while ((match = modelRegex.exec(content))) {
      const name = match[1];
      const body = match[2];
      const fields: Entity['fields'] = [];
      const relations: Entity['relations'] = [];

      body.split('\n').forEach(line => {
        const fieldMatch = /^\s*(\w+)\s+([A-Z]\w+|String|Int|Boolean|DateTime|Float|Json|Decimal)(\[\])?(\?)?/.exec(line);
        if (fieldMatch) {
          const fName = fieldMatch[1];
          const fType = fieldMatch[2];
          const isArray = !!fieldMatch[3];

          if (/[A-Z]/.test(fType[0]) && !['String','Int','Boolean','DateTime','Float','Json','Decimal'].includes(fType)) {
            relations.push({ target: fType, type: isArray ? 'one-to-many' : 'one-to-one' });
          } else {
            fields.push({ name: fName, type: fType + (isArray ? '[]' : '') });
          }
        }
      });
      entities.push({ name, fields, relations });
    }
    return entities;
  }

  private static parseDjango(content: string): Entity[] {
    const entities: Entity[] = [];
    const classRegex = /class\s+(\w+)\(models\.Model\):([\s\S]*?)(?=class|$)/g;
    let match;
    while ((match = classRegex.exec(content))) {
      const name = match[1];
      const body = match[2];
      const fields: Entity['fields'] = [];
      const relations: Entity['relations'] = [];

      body.split('\n').forEach(line => {
        const fieldMatch = /^\s*(\w+)\s*=\s*models\.(\w+)\((.*?)\)/.exec(line);
        if (fieldMatch) {
          const fName = fieldMatch[1];
          const fType = fieldMatch[2];
          const args = fieldMatch[3];
          if (fType === 'ForeignKey' || fType === 'OneToOneField') {
            const target = /['"](\w+)['"]/.exec(args)?.[1] || 'Unknown';
            relations.push({ target, type: fType === 'ForeignKey' ? 'one-to-many' : 'one-to-one' });
          } else {
            fields.push({ name: fName, type: fType });
          }
        }
      });
      entities.push({ name, fields, relations });
    }
    return entities;
  }

  static detectStack(nodes: FileNode[]): AnalysisResult['stack'] {
    const fe: string[] = [];
    const be: string[] = [];
    const de: string[] = [];

    const all = this.flatten(nodes);
    if (all.some(p => p.includes('package.json'))) fe.push('Node.js');
    if (all.some(p => p.includes('tsconfig.json'))) fe.push('TypeScript');
    if (all.some(p => p.includes('tailwind.config'))) fe.push('Tailwind CSS');
    if (all.some(p => p.includes('next.config'))) fe.push('Next.js');
    if (all.some(p => p.includes('App.tsx'))) fe.push('React');
    
    if (all.some(p => p.includes('manage.py'))) be.push('Django');
    if (all.some(p => p.includes('requirements.txt'))) be.push('Python');
    if (all.some(p => p.includes('prisma'))) be.push('Prisma');
    if (all.some(p => p.includes('go.mod'))) be.push('Go');

    if (all.some(p => p.includes('Dockerfile'))) de.push('Docker');
    if (all.some(p => p.includes('.github/workflows'))) de.push('GitHub Actions');

    return { frontend: fe, backend: be, devops: de };
  }

  private static flatten(nodes: FileNode[]): string[] {
    return nodes.reduce((acc, n) => [...acc, n.path, ...(n.children ? this.flatten(n.children) : [])], [] as string[]);
  }
}