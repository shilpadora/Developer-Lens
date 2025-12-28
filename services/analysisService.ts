
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileNode } from "../types";

export class AnalysisService {
  static async analyzeRepo(repoName: string, tree: FileNode[]): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const fileList = this.getSummary(tree).join(', ');
    const prompt = `Perform a high-level developer lens analysis on this repository: ${repoName}. 
    The file structure summary is: ${fileList}. 
    Focus on code patterns, likely architecture, and potential performance bottlenecks based on common stacks. 
    Use Google Search to cross-reference common issues with this specific tech stack if applicable.`;

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
                devops: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['frontend', 'backend', 'devops']
            }
          },
          required: ['performance', 'architecture', 'codeQuality', 'stack']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'External Resource',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      ...data,
      sources
    };
  }

  private static getSummary(nodes: FileNode[], depth = 0): string[] {
    if (depth > 2) return [];
    let list: string[] = [];
    nodes.forEach(n => {
      list.push(n.name);
      if (n.children) list.push(...this.getSummary(n.children, depth + 1));
    });
    return list.slice(0, 50); // Limit to 50 entries for prompt
  }
}
