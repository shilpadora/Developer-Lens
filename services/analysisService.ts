
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileNode } from "../types";

export class AnalysisService {
  static async analyze(repoName: string, tree: FileNode[]): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Flatten tree to look for critical configuration files
    const allFiles: string[] = [];
    const collect = (nodes: FileNode[]) => {
      nodes.forEach(n => {
        allFiles.push(n.path);
        if (n.children) collect(n.children);
      });
    };
    collect(tree);

    const configFiles = allFiles.filter(f => 
      f.endsWith('package.json') || 
      f.endsWith('requirements.txt') || 
      f.endsWith('pyproject.toml') || 
      f.endsWith('docker-compose.yml') || 
      f.endsWith('Dockerfile') || 
      f.endsWith('.env') || 
      f.includes('.github/workflows') ||
      f.endsWith('terraform.tf') ||
      f.includes('charts/')
    );

    const prompt = `Analyze this project: ${repoName}. 
    Available configuration files: ${configFiles.join(', ')}.
    Identify the Tech Stack and Dependencies:
    1. Frontend: Framework (React, Vue, etc.) and main libraries from package.json.
    2. Backend: Framework (Flask, FastAPI, Django, Express, etc.) and libraries from requirements.txt or pyproject.toml.
    3. Databases: Mentioned in .env or settings (MySQL, PostgreSQL, MongoDB, Redis, etc.).
    4. DevOps: CI/CD (GitHub Actions), Infrastructure (Terraform), Containerization (Docker, K8s, Helm).
    
    Also provide a brief Code Audit (Performance, Architecture, Quality).
    Research best practices for this specific stack using Google Search.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            performance: { type: Type.STRING },
            architecture: { type: Type.STRING },
            codeQuality: { type: Type.STRING },
            stack: {
              type: Type.OBJECT,
              properties: {
                frontend: { type: Type.ARRAY, items: { type: Type.STRING } },
                backend: { type: Type.ARRAY, items: { type: Type.STRING } },
                devops: { type: Type.ARRAY, items: { type: Type.STRING } },
                databases: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['frontend', 'backend', 'devops', 'databases']
            },
            libraries: {
              type: Type.OBJECT,
              properties: {
                frontend: { type: Type.ARRAY, items: { type: Type.STRING } },
                backend: { type: Type.ARRAY, items: { type: Type.STRING } },
                devops: { type: Type.ARRAY, items: { type: Type.STRING } },
                databases: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['frontend', 'backend', 'devops', 'databases']
            }
          },
          required: ['performance', 'architecture', 'codeQuality', 'stack', 'libraries']
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from AI");
    }

    const result = JSON.parse(textOutput);
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      title: c.web?.title || 'Documentation',
      uri: c.web?.uri || '#'
    })) || [];

    return { ...result, sources };
  }
}
