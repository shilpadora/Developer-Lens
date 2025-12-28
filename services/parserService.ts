
import { Entity, FileNode } from '../types';

export class ParserService {
  static parsePrisma(content: string): Entity[] {
    const entities: Entity[] = [];
    const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const fields: Array<{ name: string; type: string }> = [];
      const relations: Array<{ target: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' }> = [];

      const lines = body.split('\n');
      lines.forEach(line => {
        const fieldMatch = /^\s*(\w+)\s+(\w+)(\[\])?(\?)?(\s+@relation)?/i.exec(line);
        if (fieldMatch) {
          const fName = fieldMatch[1];
          const fType = fieldMatch[2];
          const isArray = !!fieldMatch[3];
          
          if (/[A-Z]/.test(fType[0])) {
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

  static parsePythonModels(content: string): Entity[] {
    const entities: Entity[] = [];
    const classRegex = /class\s+(\w+)\(models\.Model\):([\s\S]*?)(?=class|$)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const fields: Array<{ name: string; type: string }> = [];
      const relations: Array<{ target: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' }> = [];

      const fieldLines = body.split('\n');
      fieldLines.forEach(line => {
        const modelField = /^\s*(\w+)\s*=\s*models\.(\w+)Field\((.*?)\)/.exec(line);
        if (modelField) {
          const fName = modelField[1];
          const fType = modelField[2];
          const args = modelField[3];

          if (fType === 'ForeignKey') {
            const targetMatch = /['"](.*?)['"]/.exec(args);
            relations.push({ target: targetMatch ? targetMatch[1] : 'Unknown', type: 'one-to-many' });
          } else {
            fields.push({ name: fName, type: fType });
          }
        }
      });
      entities.push({ name, fields, relations });
    }
    return entities;
  }

  static detectStack(tree: FileNode[]): { frontend: string[], backend: string[], devops: string[] } {
    const fe: string[] = [];
    const be: string[] = [];
    const de: string[] = [];

    const allPaths = this.flattenTree(tree);

    if (allPaths.some(p => p.includes('package.json'))) fe.push('Node.js');
    if (allPaths.some(p => p.includes('tsconfig.json'))) fe.push('TypeScript');
    if (allPaths.some(p => p.includes('tailwind.config'))) fe.push('Tailwind CSS');
    if (allPaths.some(p => p.includes('next.config'))) fe.push('Next.js');
    if (allPaths.some(p => p.includes('App.tsx') || p.includes('App.js'))) fe.push('React');
    
    if (allPaths.some(p => p.includes('manage.py'))) be.push('Django');
    if (allPaths.some(p => p.includes('requirements.txt'))) be.push('Python');
    if (allPaths.some(p => p.includes('prisma'))) be.push('Prisma');
    if (allPaths.some(p => p.includes('go.mod'))) be.push('Go');
    if (allPaths.some(p => p.includes('pom.xml'))) be.push('Java/Maven');

    if (allPaths.some(p => p.includes('Dockerfile'))) de.push('Docker');
    if (allPaths.some(p => p.includes('docker-compose'))) de.push('Docker Compose');
    if (allPaths.some(p => p.includes('.github/workflows'))) de.push('GitHub Actions');
    if (allPaths.some(p => p.includes('terraform'))) de.push('Terraform');

    return { frontend: fe, backend: be, devops: de };
  }

  private static flattenTree(nodes: FileNode[]): string[] {
    let paths: string[] = [];
    nodes.forEach(n => {
      paths.push(n.path);
      if (n.children) paths.push(...this.flattenTree(n.children));
    });
    return paths;
  }
}
