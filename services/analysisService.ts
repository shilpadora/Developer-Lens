import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileNode } from "../types";

export class AnalysisService {
  static async analyze(repoName: string, tree: FileNode[]): Promise<AnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const summary = this.getSummary(tree).join(', ');
    const prompt = `Analyze this project structure: ${repoName}. Files: ${summary}.
    Provide a high-fidelity code audit including:
    1. Performance analysis.
    2. Architectural patterns identified.
    3. Code quality assessment.
    Also identify the tech stack.
    Use Google Search to find related best practices or known issues for this stack.`;

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

    const result = JSON.parse(response.text || '{}');
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      title: c.web?.title || 'Documentation',
      uri: c.web?.uri || '#'
    })) || [];

    return { ...result, sources };
  }

  private static getSummary(nodes: FileNode[], depth = 0): string[] {
    if (depth > 1) return [];
    return nodes.map(n => n.name).slice(0, 30);
  }
}