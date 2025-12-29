
import { Entity, FileNode } from '../types';

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
      const indexes: string[] = [];

      body.split('\n').forEach(line => {
        if (line.includes('@@index') || line.includes('@@unique') || line.includes('@@id')) {
          indexes.push(line.trim());
          return;
        }

        const fieldMatch = /^\s*(\w+)\s+([A-Z]\w+|String|Int|Boolean|DateTime|Float|Json|Decimal)(\[\])?(\?)?(\s+@\w+.*)?/.exec(line);
        if (fieldMatch) {
          const fName = fieldMatch[1];
          const fType = fieldMatch[2];
          const isArray = !!fieldMatch[3];
          const decorators = fieldMatch[5] || '';

          const isPK = decorators.includes('@id');
          const isUnique = decorators.includes('@unique');

          if (/[A-Z]/.test(fType[0]) && !['String','Int','Boolean','DateTime','Float','Json','Decimal'].includes(fType)) {
            const relNameMatch = /@relation\(\s*name:\s*['"](\w+)['"]/.exec(decorators);
            relations.push({ 
              target: fType, 
              type: isArray ? 'one-to-many' : 'one-to-one',
              name: relNameMatch ? relNameMatch[1] : undefined
            });
          } else {
            fields.push({ name: fName, type: fType + (isArray ? '[]' : ''), isPrimaryKey: isPK, isUnique });
          }
        }
      });
      entities.push({ name, fields, relations, indexes });
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
      const indexes: string[] = [];

      body.split('\n').forEach(line => {
        const fieldMatch = /^\s*(\w+)\s*=\s*models\.(\w+)\((.*?)\)/.exec(line);
        if (fieldMatch) {
          const fName = fieldMatch[1];
          const fType = fieldMatch[2];
          const args = fieldMatch[3];

          const isPK = args.includes('primary_key=True');
          const isUnique = args.includes('unique=True');

          if (fType === 'ForeignKey' || fType === 'OneToOneField' || fType === 'ManyToManyField') {
            const targetMatch = /['"](\w+)['"]|(\w+)/.exec(args);
            const target = targetMatch ? (targetMatch[1] || targetMatch[2]) : 'Unknown';
            const relatedMatch = /related_name\s*=\s*['"](\w+)['"]/.exec(args);
            
            relations.push({ 
              target, 
              type: fType === 'ForeignKey' ? 'one-to-many' : fType === 'ManyToManyField' ? 'many-to-many' : 'one-to-one',
              name: relatedMatch ? relatedMatch[1] : undefined
            });
          } else {
            fields.push({ name: fName, type: fType, isPrimaryKey: isPK, isUnique });
          }
        }
        
        if (line.includes('indexes =') || line.includes('unique_together =')) {
          indexes.push(line.trim());
        }
      });
      entities.push({ name, fields, relations, indexes });
    }
    return entities;
  }

  static parseCodeStructure(content: string, fileName: string): FileNode[] {
    const results: FileNode[] = [];
    const lines = content.split('\n');
    const isPython = fileName.endsWith('.py');
    
    if (isPython) {
      const classRegex = /^class\s+(\w+)/;
      const defRegex = /^\s{4}def\s+(\w+)/;
      const topDefRegex = /^def\s+(\w+)/;
      let currentClass: FileNode | null = null;

      lines.forEach((line) => {
        const classMatch = line.match(classRegex);
        if (classMatch) {
          currentClass = {
            name: classMatch[1],
            path: `${fileName}/${classMatch[1]}`,
            type: 'tree',
            kind: 'class',
            complexity: 'medium',
            children: []
          };
          results.push(currentClass);
        }
        const methodMatch = line.match(defRegex);
        if (methodMatch && currentClass) {
          currentClass.children?.push({
            name: methodMatch[1],
            path: `${currentClass.path}/${methodMatch[1]}`,
            type: 'blob',
            kind: 'function',
            complexity: 'low'
          });
        }
        const topDefMatch = line.match(topDefRegex);
        if (topDefMatch) {
          results.push({ name: topDefMatch[1], path: `${fileName}/${topDefMatch[1]}`, type: 'blob', kind: 'function', complexity: 'low' });
        }
      });
    } else {
      const classRegex = /class\s+(\w+)/;
      const funcRegex = /(?:function|const|let|var)\s+(\w+)\s*(?:=|\()/;
      lines.forEach((line) => {
        const classMatch = line.match(classRegex);
        if (classMatch) {
          results.push({ name: classMatch[1], path: `${fileName}/${classMatch[1]}`, type: 'tree', kind: 'class', complexity: 'medium', children: [] });
        }
        const funcMatch = line.match(funcRegex);
        if (funcMatch && !line.includes('class ')) {
          results.push({ name: funcMatch[1], path: `${fileName}/${funcMatch[1]}`, type: 'blob', kind: 'function', complexity: 'low' });
        }
      });
    }
    return results;
  }
}
